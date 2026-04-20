import { createCcmFeedbackHandler } from "@ccm-feedback/adapter-prisma";
import { resolveStore } from "@/lib/store";

const store = await resolveStore();

export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({ store });
