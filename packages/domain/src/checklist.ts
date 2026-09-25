import { z } from "zod";
import type { MembershipRole } from "./company";

export const checklistStatuses = [
  "suggested",
  "accepted",
  "in_progress",
  "evidence_submitted",
  "user_completed",
  "reviewer_verified",
  "dismissed_with_reason",
  "blocked",
  "superseded",
] as const;
export const checklistStatusSchema = z.enum(checklistStatuses);
export type ChecklistStatus = z.infer<typeof checklistStatusSchema>;

export const checklistStatusLabels: Record<ChecklistStatus, string> = {
  suggested: "Suggested",
  accepted: "Accepted",
  in_progress: "In progress",
  evidence_submitted: "Evidence submitted",
  user_completed: "Completed by you",
  reviewer_verified: "Verified by reviewer",
  dismissed_with_reason: "Dismissed",
  blocked: "Blocked",
  superseded: "No longer applies",
};

interface Transition {
  to: ChecklistStatus;
  roles: readonly MembershipRole[];
  requires?: "evidence" | "reason";
}

const founderRoles: readonly MembershipRole[] = ["owner", "member"];

/** Allowed transitions per current status. Anything absent is rejected. */
export const checklistTransitions: Record<ChecklistStatus, readonly Transition[]> = {
  suggested: [
    { to: "accepted", roles: founderRoles },
    { to: "dismissed_with_reason", roles: founderRoles, requires: "reason" },
    { to: "blocked", roles: founderRoles, requires: "reason" },
  ],
  accepted: [
    { to: "in_progress", roles: founderRoles },
    { to: "blocked", roles: founderRoles, requires: "reason" },
    { to: "dismissed_with_reason", roles: founderRoles, requires: "reason" },
  ],
  in_progress: [
    { to: "evidence_submitted", roles: founderRoles, requires: "evidence" },
    { to: "user_completed", roles: founderRoles, requires: "evidence" },
    { to: "blocked", roles: founderRoles, requires: "reason" },
  ],
  evidence_submitted: [
    { to: "user_completed", roles: founderRoles },
    { to: "reviewer_verified", roles: ["reviewer"] },
    { to: "in_progress", roles: founderRoles },
  ],
  user_completed: [
    { to: "reviewer_verified", roles: ["reviewer"] },
    { to: "in_progress", roles: founderRoles },
  ],
  reviewer_verified: [],
  dismissed_with_reason: [{ to: "suggested", roles: founderRoles }],
  blocked: [
    { to: "in_progress", roles: founderRoles },
    { to: "dismissed_with_reason", roles: founderRoles, requires: "reason" },
  ],
  superseded: [],
};

export interface TransitionCheck {
  ok: boolean;
  error?: string;
}

export function checkChecklistTransition(
  from: ChecklistStatus,
  to: ChecklistStatus,
  role: MembershipRole,
  input: { evidence?: string | undefined; reason?: string | undefined },
): TransitionCheck {
  const t = checklistTransitions[from].find((x) => x.to === to);
  if (!t) return { ok: false, error: `Cannot move from ${from} to ${to}` };
  if (!t.roles.includes(role)) return { ok: false, error: `Role ${role} cannot mark an item ${to}` };
  if (t.requires === "evidence" && !input.evidence?.trim()) return { ok: false, error: "Evidence is required" };
  if (t.requires === "reason" && !input.reason?.trim()) return { ok: false, error: "A reason is required" };
  return { ok: true };
}

export const checklistTransitionInputSchema = z.object({
  to: checklistStatusSchema,
  evidence: z.string().trim().max(2000).optional(),
  reason: z.string().trim().max(500).optional(),
  /** Optimistic concurrency: the item version the client last saw. */
  expectedVersion: z.number().int().positive(),
});
export type ChecklistTransitionInput = z.infer<typeof checklistTransitionInputSchema>;

export const checklistItemSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  ruleId: z.string(),
  ruleVersion: z.string(),
  assessmentId: z.uuid(),
  status: checklistStatusSchema,
  version: z.number().int(),
  evidence: z.string().nullable(),
  reason: z.string().nullable(),
  completedBy: z.uuid().nullable(),
  completedAt: z.string().nullable(),
  updatedAt: z.string(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const doneStatuses: readonly ChecklistStatus[] = ["user_completed", "reviewer_verified"];
