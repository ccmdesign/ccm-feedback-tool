import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROUTE_TEMPLATE = `import { createCcmFeedbackHandler } from "@ccm-feedback/adapter-prisma";
import { prisma } from "@/lib/prisma";

export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({
  prisma,
  // Uncomment to require authentication:
  // apiKey: process.env.CCM_FEEDBACK_API_KEY,
  // allowedOrigins: ["https://your-site.com"],
});
`;

/**
 * Generate the Next.js App Router API route file.
 *
 * Creates `app/api/feedback/route.ts` with the handler setup.
 * Skips if the file already exists.
 */
export function generateRoute(basePath: string = process.cwd()): { created: boolean; path: string } {
  // Detect app directory
  const appDir = existsSync(join(basePath, "src", "app")) ? join(basePath, "src", "app") : join(basePath, "app");

  if (!existsSync(appDir)) {
    throw new Error("Cannot find the app/ directory. Are you in a Next.js App Router project?");
  }

  const routePath = join(appDir, "api", "feedback", "route.ts");

  if (existsSync(routePath)) {
    return { created: false, path: routePath };
  }

  try {
    mkdirSync(dirname(routePath), { recursive: true });
    writeFileSync(routePath, ROUTE_TEMPLATE, "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EACCES" || code === "EPERM") {
      throw new Error(`Permission denied: cannot write to ${routePath}. Check file permissions.`);
    }
    throw error;
  }

  return { created: true, path: routePath };
}
