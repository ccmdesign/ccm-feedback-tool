import { describe, expect, it, vi } from "vitest";
import { extensionForMime, isSafeSvg, sniffImage } from "../src/asset-mirror.js";
import { createAssetMirrorHandler } from "../src/asset-mirror-handler.js";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe("isSafeSvg", () => {
  it("rejects SVGs containing <script>", () => {
    expect(isSafeSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')).toBe(false);
  });

  it("rejects SVGs with on* attributes", () => {
    expect(isSafeSvg('<svg onload="alert(1)"></svg>')).toBe(false);
    expect(isSafeSvg('<svg><image onerror="alert(1)" /></svg>')).toBe(false);
  });

  it("accepts a plain inline SVG", () => {
    expect(isSafeSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" /></svg>')).toBe(true);
  });
});

describe("extensionForMime", () => {
  it("maps each allowed MIME to its canonical extension", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/webp")).toBe("webp");
    expect(extensionForMime("image/avif")).toBe("avif");
    expect(extensionForMime("image/svg+xml")).toBe("svg");
    expect(extensionForMime("image/gif")).toBe("gif");
  });
});

describe("sniffImage", () => {
  it("detects PNG + dimensions from magic header", () => {
    // PNG signature + IHDR with width 10, height 20.
    const header = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // signature
      0x00,
      0x00,
      0x00,
      0x0d, // IHDR length
      0x49,
      0x48,
      0x44,
      0x52, // "IHDR"
      0x00,
      0x00,
      0x00,
      0x0a, // width = 10
      0x00,
      0x00,
      0x00,
      0x14, // height = 20
    ]);
    const result = sniffImage(header);
    expect(result).toEqual({ width: 10, height: 20, mime: "image/png" });
  });

  it("detects GIF + dimensions from magic header", () => {
    const header = new Uint8Array([
      0x47,
      0x49,
      0x46,
      0x38,
      0x39,
      0x61, // "GIF89a"
      0x05,
      0x00, // width = 5 (LE)
      0x07,
      0x00, // height = 7 (LE)
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0, // pad to 18 bytes
    ]);
    const result = sniffImage(header);
    expect(result).toEqual({ width: 5, height: 7, mime: "image/gif" });
  });

  it("returns null for unknown magic bytes", () => {
    expect(sniffImage(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBeNull();
  });

  it("identifies SVG from XML/svg prefix", () => {
    const svgText = '<?xml version="1.0"?><svg width="100" height="50" xmlns="http://www.w3.org/2000/svg"></svg>';
    const buffer = new TextEncoder().encode(svgText);
    const result = sniffImage(buffer);
    expect(result?.mime).toBe("image/svg+xml");
  });
});

// ---------------------------------------------------------------------------
// Handler tests
// ---------------------------------------------------------------------------

function pngFixture(width = 2, height = 3): Uint8Array {
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52,
    0,
    0,
    0,
    width,
    0,
    0,
    0,
    height,
    // minimal tail so the buffer is > 24 bytes
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
}

function storageClient({ uploadError = false }: { uploadError?: boolean } = {}) {
  const calls: Array<{ path: string; body: Uint8Array; contentType: string }> = [];
  return {
    upload: vi.fn(async (path: string, body: Uint8Array, options: { contentType: string }) => {
      calls.push({ path, body, contentType: options.contentType });
      if (uploadError) return { data: null, error: { message: "boom" } };
      return { data: { path }, error: null };
    }),
    getPublicUrl: vi.fn((path: string) => ({
      data: { publicUrl: `https://fake.supabase.co/storage/v1/object/public/assets/${path}` },
    })),
    _calls: calls,
  };
}

function projectStore(present: boolean) {
  return {
    getProject: vi.fn(async () =>
      present
        ? {
            id: "proj-1",
            name: "demo",
            stagingUrl: "",
            implementationWebhookUrl: null,
            hasSecret: false,
            createdAt: new Date(),
          }
        : null,
    ),
  };
}

function jsonRequest(body: unknown): Request {
  return new Request("http://local/api/v1/assets/mirror", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("createAssetMirrorHandler", () => {
  it("returns 400 on invalid JSON", async () => {
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin: "https://fake.supabase.co/storage/v1/object/public/assets/",
    });
    const res = await handler(
      new Request("http://local", {
        method: "POST",
        body: "not json",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when projectId is unknown", async () => {
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(false),
      storageClient: storageClient(),
      storageOrigin: "https://fake.supabase.co/storage/v1/object/public/assets/",
    });
    const res = await handler(jsonRequest({ projectId: "missing", url: "https://e/1.jpg" }));
    expect(res.status).toBe(404);
  });

  it("short-circuits when the URL is already on the CCM storage origin", async () => {
    const storage = storageClient();
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storage,
      storageOrigin: "https://fake.supabase.co/storage/v1/object/public/assets/",
    });
    const existing = "https://fake.supabase.co/storage/v1/object/public/assets/proj-1/abc.jpg";
    const res = await handler(jsonRequest({ projectId: "proj-1", url: existing }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { proposedAssetUrl: string; alreadyMirrored: boolean };
    expect(body.proposedAssetUrl).toBe(existing);
    expect(body.alreadyMirrored).toBe(true);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("rejects when HEAD content-type is not an image", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(null, { status: 200, headers: { "content-type": "text/html", "content-length": "200" } }),
    );
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin: "https://fake.supabase.co/storage/v1/object/public/assets/",
      fetch: fetchFn as unknown as typeof globalThis.fetch,
    });
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "https://ext.example.com/page.html" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("content-type-not-allowed");
  });

  it("rejects oversized sources declared in HEAD", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(null, {
          status: 200,
          headers: { "content-type": "image/jpeg", "content-length": `${11 * 1024 * 1024}` },
        }),
    );
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin: "https://fake.supabase.co/storage/v1/object/public/assets/",
      fetch: fetchFn as unknown as typeof globalThis.fetch,
    });
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "https://ext.example.com/big.jpg" }));
    expect(res.status).toBe(400);
  });

  it("rejects SVG payloads containing <script>", async () => {
    const svgBuffer = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    let firstCall = true;
    const fetchFn = vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.method === "HEAD" || firstCall) {
        firstCall = false;
        return new Response(null, {
          status: 200,
          headers: { "content-type": "image/svg+xml", "content-length": `${svgBuffer.byteLength}` },
        });
      }
      return new Response(svgBuffer, { status: 200 });
    });
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin: "https://fake.supabase.co/storage/v1/object/public/assets/",
      fetch: fetchFn as unknown as typeof globalThis.fetch,
    });
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "https://ext.example.com/bad.svg" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("unsafe-svg");
  });

  it("happy path — uploads a PNG and returns the CCM-hosted URL + meta", async () => {
    const buffer = pngFixture(2, 3);
    const fetchFn = vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: { "content-type": "image/png", "content-length": `${buffer.byteLength}` },
        });
      }
      return new Response(buffer, { status: 200 });
    });
    const storage = storageClient();
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storage,
      storageOrigin: "https://fake.supabase.co/storage/v1/object/public/assets/",
      fetch: fetchFn as unknown as typeof globalThis.fetch,
      uuid: () => "fixed-uuid",
    });
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "https://ext.example.com/photo.png" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      proposedAssetUrl: string;
      assetMeta: { width: number; height: number; sizeBytes: number; mime: string };
    };
    expect(body.proposedAssetUrl).toBe(
      "https://fake.supabase.co/storage/v1/object/public/assets/proj-1/fixed-uuid.png",
    );
    expect(body.assetMeta.width).toBe(2);
    expect(body.assetMeta.height).toBe(3);
    expect(body.assetMeta.mime).toBe("image/png");
    expect(storage.upload).toHaveBeenCalledOnce();
    const uploadArgs = storage.upload.mock.calls[0] as unknown as [
      string,
      Uint8Array,
      { contentType: string; upsert?: boolean },
    ];
    expect(uploadArgs[2].contentType).toBe("image/png");
    expect(uploadArgs[2].upsert).toBe(false);
    expect(uploadArgs[0]).toBe("proj-1/fixed-uuid.png");
  });

  it("returns 502 when storage upload fails", async () => {
    const buffer = pngFixture();
    const fetchFn = vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: { "content-type": "image/png", "content-length": `${buffer.byteLength}` },
        });
      }
      return new Response(buffer, { status: 200 });
    });
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storageClient({ uploadError: true }),
      storageOrigin: "https://fake.supabase.co/storage/v1/object/public/assets/",
      fetch: fetchFn as unknown as typeof globalThis.fetch,
    });
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "https://ext.example.com/photo.png" }));
    expect(res.status).toBe(502);
  });

  it("returns 400 when downloaded body exceeds size cap despite misleading HEAD", async () => {
    const buffer = new Uint8Array(11 * 1024 * 1024); // 11 MB
    buffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const fetchFn = vi.fn(async (_input: unknown, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, { status: 200, headers: { "content-type": "image/png" } });
      }
      return new Response(buffer, { status: 200 });
    });
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin: "https://fake.supabase.co/storage/v1/object/public/assets/",
      fetch: fetchFn as unknown as typeof globalThis.fetch,
    });
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "https://ext.example.com/big.png" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("source-too-large");
  });
});
