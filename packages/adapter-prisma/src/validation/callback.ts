import * as zod from "zod";

const z: typeof zod.z = ("z" in zod ? zod.z : zod) as typeof zod.z;

/** Annotation status callback body — spec §6.2. Custom statuses are allowed. */
export const annotationStatusCallbackSchema = z.object({
  status: z.string().min(1).max(64),
  result: z.record(z.string(), z.unknown()).optional(),
  updated_at: z.string().datetime(),
});

export type AnnotationStatusCallbackRequest = zod.z.infer<typeof annotationStatusCallbackSchema>;
