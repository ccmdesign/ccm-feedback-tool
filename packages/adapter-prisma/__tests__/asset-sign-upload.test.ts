import { describe, expect, it, vi } from "vitest";
import { createAssetSignUploadHandler } from "../src/asset-sign-upload-handler.js";

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
  return new Request("http://local/api/v1/assets/sign-upload", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function storageClient({ signError = false }: { signError?: boolean } = {}) {
  return {
    createSignedUploadUrl: vi.fn(async (path: string) => {
      if (signError) return { data: null, error: { message: "boom" } };
      return {
        data: {
          signedUrl: `https://fake.supabase.co/storage/upload/sign/${path}?token=abc`,
          token: "abc",
          path,
        },
        error: null,
      };
    }),
    getPublicUrl: vi.fn((path: string) => ({
      data: { publicUrl: `https://fake.supabase.co/storage/v1/object/public/assets/${path}` },
    })),
  };
}

describe("createAssetSignUploadHandler", () => {
  const storageOrigin = "https://fake.supabase.co/storage/v1/object/public/assets/";

  it("returns 400 on malformed JSON", async () => {
    const handler = createAssetSignUploadHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin,
    });
    const res = await handler(
      new Request("http://local", { method: "POST", body: "oops", headers: { "content-type": "application/json" } }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown projects", async () => {
    const handler = createAssetSignUploadHandler({
      projectStore: projectStore(false),
      storageClient: storageClient(),
      storageOrigin,
    });
    const res = await handler(
      jsonRequest({ projectId: "missing", filename: "a.jpg", contentType: "image/jpeg", sizeBytes: 100 }),
    );
    expect(res.status).toBe(404);
  });

  it("rejects oversized sizeBytes via schema", async () => {
    const handler = createAssetSignUploadHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin,
    });
    const res = await handler(
      jsonRequest({
        projectId: "proj-1",
        filename: "big.jpg",
        contentType: "image/jpeg",
        sizeBytes: 11 * 1024 * 1024,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects unsupported contentType", async () => {
    const handler = createAssetSignUploadHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin,
    });
    const res = await handler(
      jsonRequest({ projectId: "proj-1", filename: "pic.tiff", contentType: "image/tiff", sizeBytes: 100 }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects image/svg+xml on the signed-upload path (CCM-282 P1 — SVG bypass fix)", async () => {
    // The signed-upload path hands the client a direct-PUT URL that bypasses
    // every server-side check. Accepting SVG here would be a stored-XSS hole;
    // reviewers must use the mirror path (which runs isSafeSvg() on bytes).
    const handler = createAssetSignUploadHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin,
    });
    const res = await handler(
      jsonRequest({
        projectId: "proj-1",
        filename: "evil.svg",
        contentType: "image/svg+xml",
        sizeBytes: 512,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects path-traversal filenames", async () => {
    const handler = createAssetSignUploadHandler({
      projectStore: projectStore(true),
      storageClient: storageClient(),
      storageOrigin,
    });
    const res = await handler(
      jsonRequest({
        projectId: "proj-1",
        filename: "../../../etc/passwd",
        contentType: "image/jpeg",
        sizeBytes: 100,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("happy path — returns signedUrl + CCM-hosted proposedAssetUrl with extension derived from MIME", async () => {
    const storage = storageClient();
    const handler = createAssetSignUploadHandler({
      projectStore: projectStore(true),
      storageClient: storage,
      storageOrigin,
      uuid: () => "fixed-uuid",
    });
    const res = await handler(
      jsonRequest({ projectId: "proj-1", filename: "photo.jpg", contentType: "image/jpeg", sizeBytes: 2048 }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      signedUrl: string;
      path: string;
      proposedAssetUrl: string;
      contentType: string;
    };
    expect(body.path).toBe("proj-1/fixed-uuid.jpg");
    expect(body.signedUrl).toContain("proj-1/fixed-uuid.jpg");
    expect(body.proposedAssetUrl).toBe(
      "https://fake.supabase.co/storage/v1/object/public/assets/proj-1/fixed-uuid.jpg",
    );
    expect(body.contentType).toBe("image/jpeg");
    expect(storage.createSignedUploadUrl).toHaveBeenCalledExactlyOnceWith("proj-1/fixed-uuid.jpg");
  });

  it("returns 502 when storage sign fails", async () => {
    const handler = createAssetSignUploadHandler({
      projectStore: projectStore(true),
      storageClient: storageClient({ signError: true }),
      storageOrigin,
    });
    const res = await handler(
      jsonRequest({ projectId: "proj-1", filename: "photo.jpg", contentType: "image/jpeg", sizeBytes: 200 }),
    );
    expect(res.status).toBe(502);
  });
});
