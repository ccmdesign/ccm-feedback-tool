import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreNotFoundError } from "../src/index.js";
import { ProjectStore } from "../src/project-store.js";
import { verifySecret } from "../src/secret.js";

function makePrismaMock() {
  const projects = new Map<
    string,
    {
      id: string;
      name: string;
      stagingUrl: string;
      implementationWebhookUrl: string | null;
      implementationWebhookSecretHash: string | null;
      createdAt: Date;
    }
  >();
  let idSeq = 0;

  return {
    _projects: projects,
    project: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        idSeq += 1;
        const row = {
          id: `proj_${idSeq}`,
          name: String(data.name),
          stagingUrl: String(data.stagingUrl ?? ""),
          implementationWebhookUrl: (data.implementationWebhookUrl ?? null) as string | null,
          implementationWebhookSecretHash: (data.implementationWebhookSecretHash ?? null) as string | null,
          createdAt: new Date(),
        };
        projects.set(row.id, row);
        return row;
      }),
      findMany: vi.fn(async () => Array.from(projects.values())),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => projects.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = projects.get(where.id);
        if (!row) {
          const err = new Error("Not found");
          (err as unknown as { code: string }).code = "P2025";
          throw err;
        }
        Object.assign(row, data);
        return row;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (!projects.has(where.id)) {
          const err = new Error("Not found");
          (err as unknown as { code: string }).code = "P2025";
          throw err;
        }
        projects.delete(where.id);
        return { id: where.id };
      }),
    },
    reviewBatch: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    feedbackAnnotation: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("ProjectStore", () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let store: ProjectStore;

  beforeEach(() => {
    prisma = makePrismaMock();
    store = new ProjectStore(prisma);
  });

  it("createProject returns a plaintext secret exactly once and stores a hash", async () => {
    const result = await store.createProject({
      name: "demo",
      stagingUrl: "https://demo.example.com",
      implementationWebhookUrl: "https://webhook.example.com",
    });
    expect(result.secret).toBeTruthy();
    expect(result.secret.length).toBeGreaterThanOrEqual(32);
    const row = prisma._projects.get(result.id)!;
    expect(row.implementationWebhookSecretHash).toMatch(/^scrypt:/);
  });

  it("verifyProjectSecret round-trip works immediately after create", async () => {
    const { id, secret } = await store.createProject({ name: "x", stagingUrl: "" });
    expect(await store.verifyProjectSecret(id, secret)).toBe(true);
    expect(await store.verifyProjectSecret(id, "wrong")).toBe(false);
  });

  it("rotateProjectSecret invalidates the previous secret", async () => {
    const { id, secret: oldSecret } = await store.createProject({ name: "r", stagingUrl: "" });
    const { secret: newSecret } = await store.rotateProjectSecret(id);
    expect(newSecret).not.toBe(oldSecret);
    expect(await store.verifyProjectSecret(id, oldSecret)).toBe(false);
    expect(await store.verifyProjectSecret(id, newSecret)).toBe(true);
  });

  it("rotateProjectSecret throws StoreNotFoundError for unknown ids", async () => {
    await expect(store.rotateProjectSecret("does-not-exist")).rejects.toBeInstanceOf(StoreNotFoundError);
  });

  it("listProjects strips the secret hash", async () => {
    await store.createProject({ name: "a", stagingUrl: "" });
    const rows = await store.listProjects();
    expect(rows.length).toBe(1);
    expect(rows[0].hasSecret).toBe(true);
    expect(
      (rows[0] as unknown as { implementationWebhookSecretHash?: string }).implementationWebhookSecretHash,
    ).toBeUndefined();
  });

  it("getProject never exposes the hash", async () => {
    const { id } = await store.createProject({ name: "g", stagingUrl: "" });
    const row = await store.getProject(id);
    expect(row).toBeDefined();
    expect(
      (row as unknown as { implementationWebhookSecretHash?: string }).implementationWebhookSecretHash,
    ).toBeUndefined();
    expect(row?.hasSecret).toBe(true);
  });

  it("updateProject throws StoreNotFoundError when the id is absent", async () => {
    await expect(store.updateProject("missing", { name: "new" })).rejects.toBeInstanceOf(StoreNotFoundError);
  });

  it("updateProject only sets provided fields", async () => {
    const { id } = await store.createProject({ name: "u", stagingUrl: "a" });
    await store.updateProject(id, { implementationWebhookUrl: "https://x.test" });
    const row = prisma._projects.get(id)!;
    expect(row.stagingUrl).toBe("a");
    expect(row.implementationWebhookUrl).toBe("https://x.test");
  });

  it("deleteProject throws StoreNotFoundError on missing id", async () => {
    await expect(store.deleteProject("nope")).rejects.toBeInstanceOf(StoreNotFoundError);
  });

  it("hashed secrets round-trip outside the store", async () => {
    const { id, secret } = await store.createProject({ name: "h", stagingUrl: "" });
    const row = prisma._projects.get(id)!;
    expect(await verifySecret(secret, row.implementationWebhookSecretHash!)).toBe(true);
  });
});
