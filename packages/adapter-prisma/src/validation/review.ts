import * as zod from "zod";

const z: typeof zod.z = ("z" in zod ? zod.z : zod) as typeof zod.z;

export const reviewSubmitSchema = z.object({
  projectId: z.string().min(1).max(200),
  annotationIds: z.array(z.string().min(1)).min(1).max(100),
  reviewer: z
    .object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(200).optional(),
    })
    .optional(),
});

export type ReviewSubmitRequest = zod.z.infer<typeof reviewSubmitSchema>;
