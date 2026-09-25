import { type Applicability, type FactKey, type FactMap, type Market, answeredNumber, answeredString, factState, marketLabels } from "@lex/domain";

const marketName = (f: FactMap) => {
  const m = answeredString(f, "formation_country");
  return m && m in marketLabels ? marketLabels[m as Market] : m ?? "the selected market";
};

/**
 * SYNTHETIC starter rules. These describe generic preparation and fact-gathering
 * steps for demonstration only. They are not reviewed legal content, contain no
 * statutory deadlines and must never be labelled supported or published.
 */
export const SYNTHETIC_CONTENT_VERSION = "synthetic-starter-0.1.0";

export interface RuleEvaluation {
  applicability: Applicability;
  reason: string;
  factKeysUsed: FactKey[];
  missingFactKeys: FactKey[];
}

export interface ChecklistRule {
  id: string;
  version: string;
  status: "synthetic";
  category: "formation" | "readiness" | "people" | "commercial" | "data" | "review";
  priority: 1 | 2 | 3;
  action: string;
  whyGeneric: string;
  gather: string[];
  prerequisites: string[];
  /** Source IDs from sources.ts; official destinations, not legal authority for the rule. */
  sourceIds: string[] | "market_directory";
  requiredFacts: FactKey[];
  evaluate: (facts: FactMap) => RuleEvaluation;
}

const answered = (facts: FactMap, key: FactKey) => factState(facts, key) === "answered";
const unresolved = (facts: FactMap, keys: FactKey[]) => keys.filter((k) => !answered(facts, k));

function needs(facts: FactMap, keys: FactKey[], reason: string): RuleEvaluation | null {
  const missing = unresolved(facts, keys);
  if (missing.length === 0) return null;
  return { applicability: "unknown", reason, factKeysUsed: keys.filter((k) => answered(facts, k)), missingFactKeys: missing };
}

export const syntheticRules: ChecklistRule[] = [
  {
    id: "confirm-registration-status",
    version: SYNTHETIC_CONTENT_VERSION,
    status: "synthetic",
    category: "formation",
    priority: 1,
    action: "Confirm whether the business is registered and record the evidence",
    whyGeneric: "Most later steps depend on whether an official registration exists.",
    gather: ["Registration certificate or official record, if any", "Registration number"],
    prerequisites: [],
    sourceIds: "market_directory",
    requiredFacts: ["registration_status"],
    evaluate: (f) => {
      const status = answeredString(f, "registration_status");
      if (!status) return { applicability: "yes", reason: "Registration status is not yet confirmed; this is the first fact to settle.", factKeysUsed: [], missingFactKeys: ["registration_status"] };
      if (status === "registered") {
        const missing = unresolved(f, ["registration_number", "registration_evidence"]);
        return missing.length
          ? { applicability: "yes", reason: "You said the business is registered; the registration details are still incomplete.", factKeysUsed: ["registration_status"], missingFactKeys: missing }
          : { applicability: "no", reason: "You confirmed registration and recorded evidence, so this step is complete for your profile.", factKeysUsed: ["registration_status", "registration_number", "registration_evidence"], missingFactKeys: [] };
      }
      return { applicability: "no", reason: `You recorded the business as ${status.replace("_", " ")}; the registration preparation steps apply instead.`, factKeysUsed: ["registration_status"], missingFactKeys: [] };
    },
  },
  {
    id: "prepare-registration",
    version: SYNTHETIC_CONTENT_VERSION,
    status: "synthetic",
    category: "formation",
    priority: 1,
    action: "Prepare the information a registrar typically asks for and find the official registration route",
    whyGeneric: "An unregistered business needs the official registration route for its formation location before trading formally.",
    gather: ["Proposed business name(s)", "Founder identity details", "Business address", "Description of activities"],
    prerequisites: ["confirm-registration-status"],
    sourceIds: "market_directory",
    requiredFacts: ["registration_status", "formation_country"],
    evaluate: (f) => {
      const status = answeredString(f, "registration_status");
      if (status === "registered") return { applicability: "no", reason: "The business is already registered.", factKeysUsed: ["registration_status"], missingFactKeys: [] };
      const pending = needs(f, ["registration_status", "formation_country"], "Registration status or formation location is not confirmed, so the registration route cannot be identified.");
      if (pending) return pending;
      return { applicability: "yes", reason: `The business is ${status!.replace("_", " ")} and formed in ${marketName(f)}, so the official registration route for that location applies.`, factKeysUsed: ["registration_status", "formation_country"], missingFactKeys: unresolved(f, ["formation_subdivision"]) };
    },
  },
  {
    id: "decide-legal-form",
    version: SYNTHETIC_CONTENT_VERSION,
    status: "synthetic",
    category: "formation",
    priority: 1,
    action: "Gather the facts needed to choose a legal form with an adviser",
    whyGeneric: "The legal form is unknown. This tool does not choose an entity type for you; it collects the facts a professional needs.",
    gather: ["Number of owners", "Whether you want limited liability", "Expected funding sources", "Where customers are"],
    prerequisites: [],
    sourceIds: "market_directory",
    requiredFacts: ["legal_form"],
    evaluate: (f) => {
      const state = factState(f, "legal_form");
      if (state === "answered") return { applicability: "no", reason: `You recorded the legal form as ${answeredString(f, "legal_form")!.replace(/_/g, " ")}.`, factKeysUsed: ["legal_form"], missingFactKeys: [] };
      if (answeredString(f, "registration_status") === "registered") return { applicability: "unknown", reason: "The business is registered but the legal form was not recorded; check the registration record.", factKeysUsed: ["registration_status"], missingFactKeys: ["legal_form"] };
      return { applicability: "yes", reason: state === "unknown" ? "You are not sure of the legal form, so this is a decision to prepare for rather than a fact to assume." : "The legal form has not been recorded.", factKeysUsed: [], missingFactKeys: ["legal_form"] };
    },
  },
  {
    id: "resolve-subdivision",
    version: SYNTHETIC_CONTENT_VERSION,
    status: "synthetic",
    category: "formation",
    priority: 2,
    action: "Confirm the exact legal subdivision so the right rules can be identified later",
    whyGeneric: "Requirements differ within a country. Without the subdivision, jurisdiction-specific guidance cannot be selected.",
    gather: ["State, constituent nation, country or territory as applicable"],
    prerequisites: [],
    sourceIds: [],
    requiredFacts: ["formation_country", "formation_subdivision"],
    evaluate: (f) => {
      if (!answered(f, "formation_country")) return { applicability: "unknown", reason: "Formation location not recorded.", factKeysUsed: [], missingFactKeys: ["formation_country"] };
      if (answered(f, "formation_subdivision")) return { applicability: "no", reason: `Subdivision recorded as ${answeredString(f, "formation_subdivision")}.`, factKeysUsed: ["formation_country", "formation_subdivision"], missingFactKeys: [] };
      return { applicability: "yes", reason: `You selected ${marketName(f)} but the subdivision is ${factState(f, "formation_subdivision")}.`, factKeysUsed: ["formation_country"], missingFactKeys: ["formation_subdivision"] };
    },
  },
  {
    id: "licence-question",
    version: SYNTHETIC_CONTENT_VERSION,
    status: "synthetic",
    category: "readiness",
    priority: 2,
    action: "List the activities that may need a licence and prepare them as questions for review",
    whyGeneric: "Regulated activities usually require permissions before trading. This tool records the question; it does not decide whether a licence is legally required.",
    gather: ["Plain description of each activity", "Any regulator you have already been in contact with"],
    prerequisites: [],
    sourceIds: [],
    requiredFacts: ["regulated_activity", "activities"],
    evaluate: (f) => {
      const v = answeredString(f, "regulated_activity");
      if (v === "no") return { applicability: "no", reason: "You do not believe a licence is needed. This remains your assertion, not a verified position.", factKeysUsed: ["regulated_activity"], missingFactKeys: [] };
      if (v === "yes") return { applicability: "yes", reason: "You believe a licence or approval is needed, so it should be prepared as a review question.", factKeysUsed: ["regulated_activity", "activities"], missingFactKeys: unresolved(f, ["activities"]) };
      return { applicability: "unknown", reason: "Whether a licence applies is not known; this is a targeted question for review, not an assumption either way.", factKeysUsed: unresolved(f, ["activities"]).length ? [] : ["activities"], missingFactKeys: ["regulated_activity"] };
    },
  },
  {
    id: "hiring-preparation",
    version: SYNTHETIC_CONTENT_VERSION,
    status: "synthetic",
    category: "people",
    priority: 2,
    action: "Prepare the facts needed before engaging employees or contractors",
    whyGeneric: "Engaging people creates obligations that depend on where they work and how they are engaged.",
    gather: ["Worker locations", "Intended role and arrangement", "Payment terms"],
    prerequisites: [],
    sourceIds: [],
    requiredFacts: ["employee_count", "contractor_count", "hiring_plan"],
    evaluate: (f) => {
      const emp = answeredNumber(f, "employee_count");
      const con = answeredNumber(f, "contractor_count");
      const plan = answeredString(f, "hiring_plan");
      if ((emp ?? 0) > 0 || (con ?? 0) > 0 || plan === "yes") {
        return { applicability: "yes", reason: `You recorded ${emp ?? "an unknown number of"} employees, ${con ?? "an unknown number of"} contractors and hiring plans: ${plan ?? "not recorded"}.`, factKeysUsed: (["employee_count", "contractor_count", "hiring_plan"] as FactKey[]).filter((k) => answered(f, k)), missingFactKeys: unresolved(f, ["worker_locations"]) };
      }
      if (emp === 0 && con === 0 && plan === "no") return { applicability: "no", reason: "No employees, no contractors and no hiring plans recorded.", factKeysUsed: ["employee_count", "contractor_count", "hiring_plan"], missingFactKeys: [] };
      return { applicability: "unknown", reason: "People facts are incomplete, so it is not yet clear whether hiring preparation applies.", factKeysUsed: (["employee_count", "contractor_count", "hiring_plan"] as FactKey[]).filter((k) => answered(f, k)), missingFactKeys: unresolved(f, ["employee_count", "contractor_count", "hiring_plan"]) };
    },
  },
  {
    id: "supplier-agreements",
    version: SYNTHETIC_CONTENT_VERSION,
    status: "synthetic",
    category: "commercial",
    priority: 3,
    action: "Collect your existing supplier agreements for review",
    whyGeneric: "Written supplier terms shape your commercial risk; collecting them prepares the supplier matter path.",
    gather: ["Signed agreements", "Unsigned terms you operate under"],
    prerequisites: [],
    sourceIds: [],
    requiredFacts: ["has_suppliers"],
    evaluate: (f) => {
      const v = answeredString(f, "has_suppliers");
      if (v === "yes") return { applicability: "yes", reason: "You rely on suppliers under written agreements.", factKeysUsed: ["has_suppliers"], missingFactKeys: [] };
      if (v === "no") return { applicability: "no", reason: "No supplier agreements recorded.", factKeysUsed: ["has_suppliers"], missingFactKeys: [] };
      return { applicability: "unknown", reason: "Supplier arrangements not recorded.", factKeysUsed: [], missingFactKeys: ["has_suppliers"] };
    },
  },
  {
    id: "customer-data-inventory",
    version: SYNTHETIC_CONTENT_VERSION,
    status: "synthetic",
    category: "data",
    priority: 2,
    action: "Inventory the customer data you hold and where it is stored",
    whyGeneric: "Holding personal data is a common trigger for obligations; an inventory is the factual groundwork, not a compliance conclusion.",
    gather: ["Data categories", "Storage locations and providers", "Customer countries"],
    prerequisites: [],
    sourceIds: [],
    requiredFacts: ["customer_data"],
    evaluate: (f) => {
      const v = answeredString(f, "customer_data");
      if (v === "none") return { applicability: "no", reason: "You recorded that no customer data is held.", factKeysUsed: ["customer_data"], missingFactKeys: [] };
      if (v) return { applicability: "yes", reason: `You hold ${v === "sensitive" ? "sensitive" : v} customer data, so an inventory is the first step.`, factKeysUsed: ["customer_data"], missingFactKeys: unresolved(f, ["customer_markets"]) };
      return { applicability: "unknown", reason: "Customer data holdings not recorded.", factKeysUsed: [], missingFactKeys: ["customer_data"] };
    },
  },
  {
    id: "adviser-brief",
    version: SYNTHETIC_CONTENT_VERSION,
    status: "synthetic",
    category: "review",
    priority: 3,
    action: "Export the preparation brief and share it with a professional adviser",
    whyGeneric: "A brief of confirmed facts, unknowns and open questions saves adviser time and avoids repeating your story.",
    gather: [],
    prerequisites: ["confirm-registration-status"],
    sourceIds: [],
    requiredFacts: [],
    evaluate: () => ({ applicability: "yes", reason: "Every company benefits from a fact brief before professional review; no legal conclusion is implied.", factKeysUsed: [], missingFactKeys: [] }),
  },
];

export function findRule(ruleId: string): ChecklistRule | undefined {
  return syntheticRules.find((r) => r.id === ruleId);
}
