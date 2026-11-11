import { z } from "zod";

export const elementKeySchema = z.string().trim().min(1, "key must not be empty");

export const createElementBodySchema = z.object({
  key: elementKeySchema,
  title: z.string(),
  value: z.string().default(""),
});

export const updateElementBodySchema = z
  .object({
    title: z.string().optional(),
    value: z.string().optional(),
  })
  .refine((body) => body.title !== undefined || body.value !== undefined, {
    message: "At least one of title or value is required",
  });

export const elementParamsSchema = z.object({ key: elementKeySchema });

export type CreateElementBody = z.infer<typeof createElementBodySchema>;
export type UpdateElementBody = z.infer<typeof updateElementBodySchema>;
