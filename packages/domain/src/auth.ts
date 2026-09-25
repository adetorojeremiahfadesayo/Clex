import { z } from "zod";

export const emailSchema = z.email().trim().toLowerCase().max(254);

export const sessionUserSchema = z.object({
  id: z.uuid(),
  email: emailSchema,
  displayName: z.string(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
