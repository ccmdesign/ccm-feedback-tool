import { createCcmFeedbackHandler } from "@ccm-feedback/adapter-prisma";
import { memoryStore } from "@/lib/memory-store";

export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({
  store: memoryStore,
});
