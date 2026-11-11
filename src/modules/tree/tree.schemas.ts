import { z } from "zod";
import type { TreeNode } from "../../storage/db.types.js";

export const nodeKeySchema = z.string().trim().min(1, "key must not be empty");

export const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    key: nodeKeySchema,
    title: z.string(),
    // Optional form fields in the editor may be sent empty; store them as "".
    value: z.string().default(""),
    children: z.array(treeNodeSchema).optional(),
  }),
);

export const saveTreeBodySchema = z.object({
  treeData: z.array(treeNodeSchema),
});

export const addNodeBodySchema = z.object({
  parentKey: nodeKeySchema,
  item: treeNodeSchema,
});

export const updateNodeBodySchema = z
  .object({
    title: z.string().optional(),
    value: z.string().optional(),
  })
  .refine((body) => body.title !== undefined || body.value !== undefined, {
    message: "At least one of title or value is required",
  });

export const nodeParamsSchema = z.object({ key: nodeKeySchema });

export type SaveTreeBody = z.infer<typeof saveTreeBodySchema>;
export type AddNodeBody = z.infer<typeof addNodeBodySchema>;
export type UpdateNodeBody = z.infer<typeof updateNodeBodySchema>;
