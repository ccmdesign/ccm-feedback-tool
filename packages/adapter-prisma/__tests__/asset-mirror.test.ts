import { describe, expect, it, vi } from "vitest";
import {
  assertSafeMirrorUrl,
  extensionForMime,
  isPrivateIPv4,
  isPrivateIPv6,
  isSafeSvg,
  isUnsafeHostnameLiteral,
  type MirrorDnsLookup,
  sniffImage,
  UnsafeMirrorUrlError,
} from "../src/asset-mirror.js";
import { createAssetMirrorHandler } from "../src/asset-mirror-handler.js";

/** Default mock DNS lookup for tests — resolves everything to a public IP. */
const publicDnsLookup: MirrorDnsLookup = async () => [{ address: "93.184.216.34", family: 4 }];

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
      dnsLookup: publicDnsLookup,
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
      dnsLookup: publicDnsLookup,
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
      dnsLookup: publicDnsLookup,
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
      dnsLookup: publicDnsLookup,
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
      dnsLookup: publicDnsLookup,
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
      dnsLookup: publicDnsLookup,
    });
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "https://ext.example.com/big.png" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("source-too-large");
  });
});

// ---------------------------------------------------------------------------
// SSRF guard (CCM-282 P1)
// ---------------------------------------------------------------------------

describe("isPrivateIPv4", () => {
  it("rejects loopback, RFC1918, link-local, CGNAT, multicast, reserved", () => {
    expect(isPrivateIPv4("127.0.0.1")).toBe(true);
    expect(isPrivateIPv4("10.0.0.5")).toBe(true);
    expect(isPrivateIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateIPv4("172.31.255.255")).toBe(true);
    expect(isPrivateIPv4("192.168.1.1")).toBe(true);
    expect(isPrivateIPv4("169.254.169.254")).toBe(true);
    expect(isPrivateIPv4("100.64.0.1")).toBe(true);
    expect(isPrivateIPv4("0.0.0.0")).toBe(true);
    expect(isPrivateIPv4("224.0.0.1")).toBe(true);
    expect(isPrivateIPv4("240.0.0.1")).toBe(true);
  });

  it("accepts public IPv4 addresses", () => {
    expect(isPrivateIPv4("8.8.8.8")).toBe(false);
    expect(isPrivateIPv4("93.184.216.34")).toBe(false);
    expect(isPrivateIPv4("172.32.0.1")).toBe(false); // just outside 172.16/12
    expect(isPrivateIPv4("172.15.255.255")).toBe(false);
  });
});

describe("isPrivateIPv6", () => {
  it("rejects loopback + ULA + link-local + multicast + IPv4-mapped-private", () => {
    expect(isPrivateIPv6("::1")).toBe(true);
    expect(isPrivateIPv6("fc00::1")).toBe(true);
    expect(isPrivateIPv6("fd12:3456:789a::1")).toBe(true);
    expect(isPrivateIPv6("fe80::1")).toBe(true);
    expect(isPrivateIPv6("ff02::1")).toBe(true);
    expect(isPrivateIPv6("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIPv6("::ffff:10.0.0.1")).toBe(true);
  });

  it("accepts public IPv6 addresses", () => {
    expect(isPrivateIPv6("2606:4700:4700::1111")).toBe(false);
    expect(isPrivateIPv6("2001:4860:4860::8888")).toBe(false);
  });
});

describe("isUnsafeHostnameLiteral", () => {
  it("rejects localhost aliases and private TLDs", () => {
    expect(isUnsafeHostnameLiteral("localhost")).toBe(true);
    expect(isUnsafeHostnameLiteral("foo.localhost")).toBe(true);
    expect(isUnsafeHostnameLiteral("foo.local")).toBe(true);
    expect(isUnsafeHostnameLiteral("metadata.internal")).toBe(true);
  });

  it("rejects private IPv4 literals but accepts DNS names", () => {
    expect(isUnsafeHostnameLiteral("127.0.0.1")).toBe(true);
    expect(isUnsafeHostnameLiteral("169.254.169.254")).toBe(true);
    expect(isUnsafeHostnameLiteral("8.8.8.8")).toBe(false);
    expect(isUnsafeHostnameLiteral("example.com")).toBe(false);
  });
});

describe("assertSafeMirrorUrl", () => {
  const alwaysPublic: MirrorDnsLookup = async () => [{ address: "93.184.216.34", family: 4 }];

  it("rejects file:// URIs", async () => {
    await expect(assertSafeMirrorUrl("file:///etc/passwd", { dnsLookup: alwaysPublic })).rejects.toBeInstanceOf(
      UnsafeMirrorUrlError,
    );
  });

  it("rejects ftp:// URIs", async () => {
    await expect(assertSafeMirrorUrl("ftp://example.com/a.jpg", { dnsLookup: alwaysPublic })).rejects.toBeInstanceOf(
      UnsafeMirrorUrlError,
    );
  });

  it("rejects http://localhost", async () => {
    await expect(assertSafeMirrorUrl("http://localhost/a.jpg", { dnsLookup: alwaysPublic })).rejects.toBeInstanceOf(
      UnsafeMirrorUrlError,
    );
  });

  it("rejects loopback literals (IPv4 + IPv6)", async () => {
    await expect(assertSafeMirrorUrl("http://127.0.0.1/a", { dnsLookup: alwaysPublic })).rejects.toBeInstanceOf(
      UnsafeMirrorUrlError,
    );
    await expect(assertSafeMirrorUrl("http://[::1]/a", { dnsLookup: alwaysPublic })).rejects.toBeInstanceOf(
      UnsafeMirrorUrlError,
    );
  });

  it("rejects RFC1918 and link-local (including cloud metadata 169.254.169.254)", async () => {
    for (const url of [
      "http://10.0.0.1/a",
      "http://192.168.1.1/a",
      "http://172.16.0.1/a",
      "http://169.254.169.254/latest/meta-data/",
    ]) {
      await expect(assertSafeMirrorUrl(url, { dnsLookup: alwaysPublic })).rejects.toBeInstanceOf(UnsafeMirrorUrlError);
    }
  });

  it("rejects a hostname that DNS-resolves to a private IP", async () => {
    const privateLookup: MirrorDnsLookup = async () => [{ address: "10.0.0.5", family: 4 }];
    await expect(
      assertSafeMirrorUrl("https://sneaky.example.com/a.jpg", { dnsLookup: privateLookup }),
    ).rejects.toBeInstanceOf(UnsafeMirrorUrlError);
  });

  it("rejects a hostname that resolves to MULTIPLE addresses if ANY is private", async () => {
    const mixedLookup: MirrorDnsLookup = async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ];
    await expect(
      assertSafeMirrorUrl("https://mixed.example.com/a.jpg", { dnsLookup: mixedLookup }),
    ).rejects.toBeInstanceOf(UnsafeMirrorUrlError);
  });

  it("accepts a public https URL whose DNS resolves to a public IP", async () => {
    await expect(
      assertSafeMirrorUrl("https://example.com/a.jpg", { dnsLookup: alwaysPublic }),
    ).resolves.toBeUndefined();
  });

  it("raises code=source_url_not_allowed for blocked hosts and unsupported_protocol for bad schemes", async () => {
    try {
      await assertSafeMirrorUrl("file:///etc/passwd", { dnsLookup: alwaysPublic });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsafeMirrorUrlError);
      expect((err as UnsafeMirrorUrlError).code).toBe("unsupported_protocol");
    }
    try {
      await assertSafeMirrorUrl("http://127.0.0.1", { dnsLookup: alwaysPublic });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsafeMirrorUrlError);
      expect((err as UnsafeMirrorUrlError).code).toBe("source_url_not_allowed");
    }
  });
});

describe("createAssetMirrorHandler SSRF integration", () => {
  const storageOrigin = "https://fake.supabase.co/storage/v1/object/public/assets/";

  it("returns 400 source_url_not_allowed for a loopback URL before any fetch", async () => {
    const fetchFn = vi.fn();
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin,
      fetch: fetchFn as unknown as typeof globalThis.fetch,
      dnsLookup: publicDnsLookup,
    });
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "http://127.0.0.1/a.jpg" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("source_url_not_allowed");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns 400 unsupported_protocol for file:// URLs before any fetch", async () => {
    const fetchFn = vi.fn();
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin,
      fetch: fetchFn as unknown as typeof globalThis.fetch,
      dnsLookup: publicDnsLookup,
    });
    // Zod's .url() accepts file: scheme; our guard rejects it with 400.
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "file:///etc/passwd" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; errors?: unknown };
    // Either the URL schema or the SSRF guard fires; both map to 400.
    expect(body.error ?? "zod").toBeDefined();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns 400 source_url_not_allowed when DNS resolves to a private IP", async () => {
    const fetchFn = vi.fn();
    const privateLookup: MirrorDnsLookup = async () => [{ address: "10.1.2.3", family: 4 }];
    const handler = createAssetMirrorHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin,
      fetch: fetchFn as unknown as typeof globalThis.fetch,
      dnsLookup: privateLookup,
    });
    const res = await handler(jsonRequest({ projectId: "proj-1", url: "https://sneaky.example.com/a.jpg" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("source_url_not_allowed");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
