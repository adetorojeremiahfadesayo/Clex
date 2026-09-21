import { z } from "zod";

export const lifecycleStages = [
  "idea",
  "pre_registration",
  "registered",
  "operating",
  "scaling",
] as const;
export const lifecycleStageSchema = z.enum(lifecycleStages);
export type LifecycleStage = z.infer<typeof lifecycleStageSchema>;

export const membershipRoles = ["owner", "member", "reviewer"] as const;
export const membershipRoleSchema = z.enum(membershipRoles);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const uuidSchema = z.uuid();

export const createCompanyInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  lifecycleStage: lifecycleStageSchema,
});
export type CreateCompanyInput = z.infer<typeof createCompanyInputSchema>;

export const companySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  lifecycleStage: lifecycleStageSchema,
  createdBy: uuidSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Company = z.infer<typeof companySchema>;

export const membershipSchema = z.object({
  id: uuidSchema,
  companyId: uuidSchema,
  userId: uuidSchema,
  role: membershipRoleSchema,
  acceptedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});
export type Membership = z.infer<typeof membershipSchema>;

export const lifecycleStageLabels: Record<LifecycleStage, string> = {
  idea: "Idea stage, not yet trading",
  pre_registration: "Preparing to register",
  registered: "Registered, not yet operating",
  operating: "Registered and operating",
  scaling: "Operating and growing the team",
};
