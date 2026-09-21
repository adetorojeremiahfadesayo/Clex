import { z } from "zod";

export const emailSchema = z.email().trim().toLowerCase().max(254);
export const passwordSchema = z.string().min(10).max(200);

export const signUpInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(120),
});
export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const signInInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});
export type SignInInput = z.infer<typeof signInInputSchema>;

export const sessionUserSchema = z.object({
  id: z.uuid(),
  email: emailSchema,
  displayName: z.string(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
