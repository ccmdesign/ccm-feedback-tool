/**
 * POST /api/v1/transcribe — voice-comment pipeline (CCM-284).
 *
 * Thin wrapper over createTranscribeHandler from adapter-prisma. Adapters
 * (Whisper / Cleanup / optional Storage) are constructed from env vars.
 * Storage is opt-in via CCM_FEEDBACK_STORE_AUDIO=true so the default path
 * stays free of storage costs.
 */

import {
  adaptProjectStore,
  createAudioStorage,
  createCleanupClient,
  createTranscribeHandler,
  createWhisperClient,
} from "@ccm-feedback/adapter-prisma";
import { resolveProjectStores } from "@/lib/ccm-stores";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildHandler() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openaiKey || !openrouterKey) {
    throw new Error(
      "[ccm-feedback] /api/v1/transcribe requires OPENAI_API_KEY + OPENROUTER_API_KEY. See apps/demo/.env.example.",
    );
  }
  const whisper = createWhisperClient({ apiKey: openaiKey });
  const cleanup = createCleanupClient({
    apiKey: openrouterKey,
    ...(process.env.CCM_CLEANUP_MODEL ? { model: process.env.CCM_CLEANUP_MODEL } : {}),
  });

  const storeAudio = process.env.CCM_FEEDBACK_STORE_AUDIO === "true";
  const storage = storeAudio
    ? createAudioStorage({
        supabase: createSupabaseAdminClient(),
        bucket: process.env.SUPABASE_AUDIO_BUCKET ?? "audio",
      })
    : undefined;

  return { whisper, cleanup, storage };
}

export async function POST(request: Request): Promise<Response> {
  const { whisper, cleanup, storage } = buildHandler();

  // Resolve the internal project id via the ProjectStore when the DB is wired.
  // Without a DB (memory-store fallback), the handler falls back to using the
  // public projectName as the storage path segment.
  let projectStore: Awaited<ReturnType<typeof adaptProjectStore>> | undefined;
  if (process.env.DATABASE_URL) {
    try {
      const stores = await resolveProjectStores();
      projectStore = adaptProjectStore(stores.projectStore);
    } catch {
      projectStore = undefined;
    }
  }

  const handler = createTranscribeHandler({
    whisper,
    cleanup,
    ...(storage ? { storage } : {}),
    ...(projectStore ? { projectStore } : {}),
  });
  return handler.POST(request);
}

export async function OPTIONS(request: Request): Promise<Response> {
  // Preflight must not require OPENAI/OPENROUTER keys — those are only needed
  // for the actual transcription request. Build a noop handler just to share
  // the same CORS policy surface without constructing network clients.
  const noopWhisper = { transcribe: async () => "" };
  const noopCleanup = { clean: async () => "" };
  const handler = createTranscribeHandler({ whisper: noopWhisper, cleanup: noopCleanup });
  return handler.OPTIONS(request);
}
