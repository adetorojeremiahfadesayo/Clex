import { type FactKey, type FactMap, type Market, answeredString, factState, marketLabels } from "./facts";

export type IntakeGroup = "identity" | "geography" | "business" | "people" | "operations";

export const intakeGroupLabels: Record<IntakeGroup, string> = {
  identity: "Identity and registration",
  geography: "Where the business operates",
  business: "What the business does",
  people: "People",
  operations: "Operations and priorities",
};

export interface IntakeOption {
  value: string;
  label: string;
}

export interface IntakeQuestion {
  key: FactKey;
  group: IntakeGroup;
  prompt: string;
  help?: string;
  kind: "choice" | "text" | "number";
  options?: IntakeOption[];
  /** Whether "Not sure" is offered. Always true for facts that must never be guessed. */
  allowUnknown: boolean;
  /** Whether the question can be skipped without harming the assessment. */
  allowSkip: boolean;
  /** Adaptive gate; a question only appears when it applies to the facts so far. */
  appliesWhen?: (facts: FactMap) => boolean;
  /** Prompt overrides that depend on earlier answers. */
  promptFor?: (facts: FactMap) => string | undefined;
}

const yesNo: IntakeOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const subdivisionPrompt: Record<Market, string> = {
  NG: "Which state is the business formed or to be formed in?",
  GB: "Which UK jurisdiction applies: England and Wales, Scotland, or Northern Ireland?",
  US: "Which state (and city, if relevant) is the business formed or to be formed in?",
  EU: "Which European country (and region, if relevant)?",
  CN: "Which legal territory and locality? Mainland China, Hong Kong and Macau are distinct legal scopes.",
};

export const intakeQuestions: IntakeQuestion[] = [
  {
    key: "registration_status",
    group: "identity",
    prompt: "Is the business already registered with an official registrar?",
    kind: "choice",
    options: [
      { value: "registered", label: "Yes, registered" },
      { value: "in_progress", label: "Registration is in progress" },
      { value: "not_registered", label: "Not registered yet" },
    ],
    allowUnknown: true,
    allowSkip: false,
  },
  {
    key: "registration_number",
    group: "identity",
    prompt: "What is the registration number shown on the official record?",
    kind: "text",
    allowUnknown: true,
    allowSkip: true,
    appliesWhen: (f) => answeredString(f, "registration_status") === "registered",
  },
  {
    key: "registration_evidence",
    group: "identity",
    prompt: "Describe the registration evidence you hold (for example, certificate type and date).",
    help: "Uploading the document arrives in a later milestone. Recording it here is a user assertion, not a verification.",
    kind: "text",
    allowUnknown: true,
    allowSkip: true,
    appliesWhen: (f) => answeredString(f, "registration_status") === "registered",
  },
  {
    key: "legal_form",
    group: "identity",
    prompt: "What legal form does the business have, or intend to have?",
    help: "If you are unsure, choose Not sure. Options are not chosen for you; reviewed content for your market will explain them when available.",
    kind: "choice",
    options: [
      { value: "sole_proprietor", label: "Sole proprietor / sole trader" },
      { value: "private_company", label: "Private limited company or equivalent" },
      { value: "partnership", label: "Partnership" },
      { value: "other", label: "Other" },
    ],
    allowUnknown: true,
    allowSkip: false,
  },
  {
    key: "formation_country",
    group: "geography",
    prompt: "Where is the business formed, or where do you intend to form it?",
    kind: "choice",
    options: (Object.keys(marketLabels) as Market[]).map((m) => ({ value: m, label: marketLabels[m] })),
    allowUnknown: true,
    allowSkip: false,
  },
  {
    key: "formation_subdivision",
    group: "geography",
    prompt: "Which subdivision applies?",
    kind: "text",
    allowUnknown: true,
    allowSkip: false,
    appliesWhen: (f) => answeredString(f, "formation_country") !== undefined,
    promptFor: (f) => {
      const m = answeredString(f, "formation_country") as Market | undefined;
      return m ? subdivisionPrompt[m] : undefined;
    },
  },
  { key: "operating_locations", group: "geography", prompt: "Where does the business operate day to day?", kind: "text", allowUnknown: true, allowSkip: true },
  {
    key: "worker_locations",
    group: "geography",
    prompt: "Where are your workers based?",
    kind: "text",
    allowUnknown: true,
    allowSkip: true,
    appliesWhen: (f) => (f.employee_count?.value.state === "answered" && f.employee_count.value.value !== 0) || (f.contractor_count?.value.state === "answered" && f.contractor_count.value.value !== 0) || answeredString(f, "hiring_plan") === "yes",
  },
  { key: "customer_markets", group: "geography", prompt: "Which countries are your customers in?", kind: "text", allowUnknown: true, allowSkip: true },
  { key: "industry", group: "business", prompt: "Which industry best describes the business?", kind: "text", allowUnknown: false, allowSkip: false },
  { key: "activities", group: "business", prompt: "In plain language, what does the business do or sell?", kind: "text", allowUnknown: false, allowSkip: false },
  {
    key: "customer_type",
    group: "business",
    prompt: "Who are your customers?",
    kind: "choice",
    options: [
      { value: "b2b", label: "Businesses" },
      { value: "b2c", label: "Consumers" },
      { value: "both", label: "Both" },
    ],
    allowUnknown: true,
    allowSkip: true,
  },
  {
    key: "regulated_activity",
    group: "business",
    prompt: "Does the business carry out an activity you believe needs a licence or regulator approval?",
    help: "Answer from what you already know. Not sure is a valid answer and becomes a question for review.",
    kind: "choice",
    options: yesNo,
    allowUnknown: true,
    allowSkip: false,
  },
  { key: "founder_count", group: "people", prompt: "How many founders or owners are there?", kind: "number", allowUnknown: false, allowSkip: true },
  { key: "employee_count", group: "people", prompt: "How many employees do you have today?", kind: "number", allowUnknown: true, allowSkip: false },
  { key: "contractor_count", group: "people", prompt: "How many contractors or freelancers do you work with?", kind: "number", allowUnknown: true, allowSkip: true },
  { key: "hiring_plan", group: "people", prompt: "Do you plan to hire in the next twelve months?", kind: "choice", options: yesNo, allowUnknown: true, allowSkip: true },
  { key: "has_suppliers", group: "operations", prompt: "Do you rely on suppliers or service providers under written agreements?", kind: "choice", options: yesNo, allowUnknown: true, allowSkip: true },
  {
    key: "customer_data",
    group: "operations",
    prompt: "What kind of customer data do you hold?",
    kind: "choice",
    options: [
      { value: "none", label: "None" },
      { value: "contact", label: "Names and contact details" },
      { value: "payment", label: "Payment details" },
      { value: "sensitive", label: "Health, financial history or other sensitive data" },
    ],
    allowUnknown: true,
    allowSkip: true,
  },
  { key: "online_sales", group: "operations", prompt: "Do you sell online?", kind: "choice", options: yesNo, allowUnknown: true, allowSkip: true },
  { key: "has_adviser", group: "operations", prompt: "Do you already work with a lawyer or accountant?", kind: "choice", options: yesNo, allowUnknown: true, allowSkip: true },
  { key: "current_priority", group: "operations", prompt: "What is the most pressing thing you need help with right now?", kind: "text", allowUnknown: false, allowSkip: true },
];

export interface IntakeView {
  question: IntakeQuestion;
  prompt: string;
  state: ReturnType<typeof factState>;
  current: string | undefined;
}

/** Questions that apply to the facts so far, with their current answer state. */
export function intakeViews(facts: FactMap): IntakeView[] {
  return intakeQuestions
    .filter((q) => !q.appliesWhen || q.appliesWhen(facts))
    .map((q) => ({
      question: q,
      prompt: q.promptFor?.(facts) ?? q.prompt,
      state: factState(facts, q.key),
      current: answeredString(facts, q.key),
    }));
}

/** Applicable questions not yet answered in any way (answered, unknown or skipped). */
export function openQuestions(facts: FactMap): IntakeView[] {
  return intakeViews(facts).filter((v) => v.state === "missing");
}

export function intakeProgress(facts: FactMap): { answered: number; applicable: number; unknown: number } {
  const views = intakeViews(facts);
  return {
    applicable: views.length,
    answered: views.filter((v) => v.state !== "missing").length,
    unknown: views.filter((v) => v.state === "unknown").length,
  };
}
