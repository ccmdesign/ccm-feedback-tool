import * as zod from "zod";

const z: typeof zod.z = ("z" in zod ? zod.z : zod) as typeof zod.z;

const trimmedUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), {
    message: "Must be a URL starting with http(s):// or an empty string",
  });

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  stagingUrl: trimmedUrl.optional().default(""),
  implementationWebhookUrl: trimmedUrl.optional().nullable(),
});

export const projectUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    stagingUrl: trimmedUrl.optional(),
    implementationWebhookUrl: trimmedUrl.optional().nullable(),
  })
  .refine(
    (val) => Object.keys(val).length > 0,
    { message: "At least one field must be provided" },
  );

export const projectIdSchema = z.object({ id: z.string().min(1) });

export type ProjectCreateRequest = zod.z.infer<typeof projectCreateSchema>;
export type ProjectUpdateRequest = zod.z.infer<typeof projectUpdateSchema>;
