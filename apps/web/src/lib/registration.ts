import { type FactMap, answeredString, factState, intakeQuestions } from "@lex/domain";

export type RegistrationTaskId = "profile" | "names" | "founders" | "address" | "legal_form" | "pack" | "certificate";

export interface RegistrationTask {
  id: RegistrationTaskId;
  title: string;
  hint: string;
  done: boolean;
  locked: boolean;
}

export const legalFormOptions = intakeQuestions.find((q) => q.key === "legal_form")?.options ?? [];

/** Synthetic demo values for the registration forms. */
export const demoRegistration = {
  names: ["Clex Demo Bakery Ltd", "Lagos Crumb Ltd", "Morning Loaf Ltd"],
  founders: [
    { name: "Ada Okafor", role: "Director", share: "60" },
    { name: "Femi Bello", role: "Director", share: "40" },
  ],
  address: "12 Demo Street, Yaba, Lagos (synthetic)",
  legalForm: "private_company",
  registrationNumber: "RC-DEMO-0001",
  certificate: `SYNTHETIC SAMPLE — NOT A REAL CERTIFICATE

Certificate of incorporation (demo)
Company name: Clex Demo Bakery Ltd
Registration number: RC-DEMO-0001
Company type: Private company limited by shares
This sample exists only to demonstrate the Clex workflow.`,
};

export interface Founder { name: string; role: string; share: string }

export const serializeFounders = (rows: Founder[]) =>
  rows.filter((r) => r.name.trim()).map((r) => [r.name.trim(), r.role.trim() || "Founder", r.share.trim() ? `${r.share.trim().replace(/%$/, "")}%` : ""].filter(Boolean).join(" — ")).join("; ").slice(0, 500);

export function parseFounders(value: string | undefined): Founder[] {
  if (!value) return [];
  return value.split(";").map((row) => {
    const [name = "", role = "", share = ""] = row.split(" — ").map((s) => s.trim());
    return { name, role, share: share.replace(/%$/, "") };
  });
}

export const parseNames = (value: string | undefined) => (value ? value.split(";").map((s) => s.trim()).filter(Boolean) : []);

export function registrationTasks(facts: FactMap | null, opts: { packDownloaded: boolean; certificateUploaded: boolean }): RegistrationTask[] {
  const f = facts ?? {};
  const has = (k: Parameters<typeof answeredString>[1]) => !!answeredString(f, k);
  const prepDone = has("proposed_names") && has("founder_details") && has("registered_address") && factState(f, "legal_form") === "answered";
  const registered = answeredString(f, "registration_status") === "registered";
  return [
    { id: "profile", title: "Answer company questions", hint: "Where you're formed, what you do, who works with you.", done: !!facts, locked: false },
    { id: "names", title: "Choose company names", hint: "Up to three names, in order of preference.", done: has("proposed_names"), locked: !facts },
    { id: "founders", title: "Add founders and shares", hint: "Who owns the company and in what split.", done: has("founder_details"), locked: !facts },
    { id: "address", title: "Set the registered address", hint: "Where official letters will be sent.", done: has("registered_address"), locked: !facts },
    { id: "legal_form", title: "Confirm the legal form", hint: "The type of company you'll register.", done: factState(f, "legal_form") === "answered", locked: !facts },
    { id: "pack", title: "Download the registration pack", hint: "A PDF for your lawyer or registration agent.", done: opts.packDownloaded, locked: !prepDone },
    { id: "certificate", title: "Upload your certificate", hint: "Once registered, add the certificate and number.", done: registered && opts.certificateUploaded, locked: !prepDone },
  ];
}
