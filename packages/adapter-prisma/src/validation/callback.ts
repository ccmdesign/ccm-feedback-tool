import * as zod from "zod";

const z: typeof zod.z = ("z" in zod ? zod.z : zod) as typeof zod.z;

/** Annotation status callback body — spec §6.2. Custom statuses are allowed.
 *
 * `.strict()` rejects unknown top-level fields so forward-incompatible fields
 * from a future implementation agent are surfaced instead of silently dropped.
 */
export const annotationStatusCallbackSchema = z
  .object({
    status: z.string().min(1).max(64),
    result: z.record(z.string(), z.unknown()).optional(),
    updated_at: z.string().datetime(),
  })
  .strict();

export type AnnotationStatusCallbackRequest = zod.z.infer<typeof annotationStatusCallbackSchema>;
