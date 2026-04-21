/**
 * Project + ReviewBatch Prisma accessors for CCM-279.
 *
 * These extend the existing `PrismaStore` pattern without touching the
 * `CcmFeedbackStore` contract — admins that need projects go through
 * `ProjectStore`; widgets continue to use `PrismaStore` unchanged.
 */

import { timingSafeEqual } from "node:crypto";
import { StoreNotFoundError } from "@ccm-feedback/core";
import { generateSecret, hashSecret, verifySecret } from "./secret.js";

/**
 * Minimal Prisma client shape used by the project/review-batch stores.
 * Consumers pass their real PrismaClient — this interface exists so the
 * store types don't depend on the generated client.
 */
export interface CcmProjectPrismaClient {
  project: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown | null>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };
  reviewBatch: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown | null>;
    update: (args: unknown) => Promise<unknown>;
  };
  feedbackAnnotation: {
    findMany: (args: unknown) => Promise<unknown[]>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
    update: (args: unknown) => Promise<unknown>;
  };
}

interface RawProject {
  id: string;
  name: string;
  stagingUrl: string;
  implementationWebhookUrl: string | null;
  implementationWebhookSecretHash: string | null;
  /** CCM-290 — plaintext agent token (nullable). */
  agentToken?: string | null;
  createdAt: Date;
}

function toPublic(row: RawProject): {
  id: string;
  name: string;
  stagingUrl: string;
  implementationWebhookUrl: string | null;
  hasSecret: boolean;
  createdAt: Date;
} {
  return {
    id: row.id,
    name: row.name,
    stagingUrl: row.stagingUrl,
    implementationWebhookUrl: row.implementationWebhookUrl,
    hasSecret: Boolean(row.implementationWebhookSecretHash),
    createdAt: row.createdAt,
  };
}

/**
 * Prisma-backed implementation of Project + ReviewBatch CRUD.
 * Never returns plaintext secrets from read methods.
 */
export class ProjectStore {
  private prisma: CcmProjectPrismaClient;

  constructor(prisma: CcmProjectPrismaClient) {
    this.prisma = prisma;
  }

  async createProject(input: { name: string; stagingUrl: string; implementationWebhookUrl?: string | null }): Promise<{
    id: string;
    name: string;
    stagingUrl: string;
    implementationWebhookUrl: string | null;
    createdAt: Date;
    secret: string;
  }> {
    const plaintext = generateSecret();
    const secretHash = await hashSecret(plaintext);
    const row = (await this.prisma.project.create({
      data: {
        name: input.name,
        stagingUrl: input.stagingUrl,
        implementationWebhookUrl: input.implementationWebhookUrl ?? null,
        implementationWebhookSecretHash: secretHash,
      },
    })) as RawProject;
    return {
      id: row.id,
      name: row.name,
      stagingUrl: row.stagingUrl,
      implementationWebhookUrl: row.implementationWebhookUrl,
      createdAt: row.createdAt,
      secret: plaintext,
    };
  }

  async listProjects(): Promise<
    Array<{
      id: string;
      name: string;
      stagingUrl: string;
      implementationWebhookUrl: string | null;
      hasSecret: boolean;
      createdAt: Date;
    }>
  > {
    const rows = (await this.prisma.project.findMany({ orderBy: { createdAt: "desc" } })) as RawProject[];
    return rows.map(toPublic);
  }

  async getProject(id: string): Promise<{
    id: string;
    name: string;
    stagingUrl: string;
    implementationWebhookUrl: string | null;
    hasSecret: boolean;
    createdAt: Date;
  } | null> {
    const row = (await this.prisma.project.findUnique({ where: { id } })) as RawProject | null;
    return row ? toPublic(row) : null;
  }

  async getProjectWithSecret(id: string): Promise<RawProject | null> {
    return (await this.prisma.project.findUnique({ where: { id } })) as RawProject | null;
  }

  async updateProject(
    id: string,
    patch: {
      name?: string;
      stagingUrl?: string;
      implementationWebhookUrl?: string | null;
    },
  ): Promise<void> {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.stagingUrl !== undefined) data.stagingUrl = patch.stagingUrl;
    if (patch.implementationWebhookUrl !== undefined) data.implementationWebhookUrl = patch.implementationWebhookUrl;
    try {
      await this.prisma.project.update({ where: { id }, data });
    } catch (error) {
      if (isPrismaNotFound(error)) throw new StoreNotFoundError("Project not found");
      throw error;
    }
  }

  async rotateProjectSecret(id: string): Promise<{ secret: string }> {
    const existing = await this.getProjectWithSecret(id);
    if (!existing) throw new StoreNotFoundError("Project not found");
    const plaintext = generateSecret();
    const secretHash = await hashSecret(plaintext);
    await this.prisma.project.update({
      where: { id },
      data: { implementationWebhookSecretHash: secretHash },
    });
    return { secret: plaintext };
  }

  async verifyProjectSecret(id: string, plaintext: string): Promise<boolean> {
    const row = await this.getProjectWithSecret(id);
    if (!row?.implementationWebhookSecretHash) return false;
    return verifySecret(plaintext, row.implementationWebhookSecretHash);
  }

  async deleteProject(id: string): Promise<void> {
    try {
      await this.prisma.project.delete({ where: { id } });
    } catch (error) {
      if (isPrismaNotFound(error)) throw new StoreNotFoundError("Project not found");
      throw error;
    }
  }

  /**
   * CCM-290 — rotate (or initially generate) the plaintext `agentToken` on
   * the project. Parallels `rotateProjectSecret` but stores plaintext rather
   * than a hash (per user decision — see plan). Returns the token exactly
   * once; later reads of the token must go through `findByAgentToken` or
   * equivalent, and should only happen server-side.
   */
  async rotateAgentToken(id: string): Promise<{ agentToken: string }> {
    const existing = await this.getProjectWithSecret(id);
    if (!existing) throw new StoreNotFoundError("Project not found");
    const agentToken = generateSecret();
    await this.prisma.project.update({
      where: { id },
      data: { agentToken },
    });
    return { agentToken };
  }

  /**
   * CCM-290 — resolve a project by its agent token using a constant-time
   * compare against every project with a non-null `agentToken`.
   *
   * Implementation deliberately avoids `findFirst({ where: { agentToken } })`
   * because an indexed equality query leaks rough existence through response
   * timing. The linear scan + `timingSafeEqual` keeps the compare itself
   * timing-safe. This is acceptable at the current project scale (<100 per
   * deployment); at scale, swap to an indexed lookup plus a dummy compare to
   * equalize response time.
   */
  async findByAgentToken(token: string): Promise<{ id: string; name: string } | null> {
    if (token.length === 0) return null;
    const tokenBuf = Buffer.from(token);
    const candidates = (await this.prisma.project.findMany({
      where: { agentToken: { not: null } },
      select: { id: true, name: true, agentToken: true },
    })) as Array<{ id: string; name: string; agentToken: string | null }>;

    let match: { id: string; name: string } | null = null;
    for (const row of candidates) {
      if (row.agentToken == null) continue;
      const candidateBuf = Buffer.from(row.agentToken);
      // Length mismatch → timingSafeEqual throws; short-circuit to a constant
      // boolean so non-matching lengths don't skew the response time envelope.
      // (The hot path is length-match + byte-level timing-safe compare.)
      if (candidateBuf.length !== tokenBuf.length) continue;
      if (timingSafeEqual(candidateBuf, tokenBuf)) {
        match = { id: row.id, name: row.name };
        // Keep iterating to avoid revealing "match found" via early-exit timing.
      }
    }
    return match;
  }
}

function isPrismaNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2025";
}
