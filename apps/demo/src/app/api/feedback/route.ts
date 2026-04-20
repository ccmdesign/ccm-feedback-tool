import { createCcmFeedbackHandler } from "@ccm-feedback/adapter-prisma";
import { resolveStore } from "@/lib/store";

// Node runtime is required because `@prisma/client` cannot run on Edge.
// `force-dynamic` prevents Next from trying to statically prerender this
// route under `output: "standalone"` + `@netlify/plugin-nextjs`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const store = await resolveStore();

export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({ store });
