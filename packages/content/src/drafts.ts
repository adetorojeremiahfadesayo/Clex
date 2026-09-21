import type { EvalCase, Market, PackVersionContent, SourceInput, SourceVersionInput } from "@lex/domain";
import { officialSources } from "./sources";

/**
 * DRAFT pack manifests for every target market. They are bootstrap content for the
 * publication workflow: generic preparation rules citing official directories only.
 * They are not reviewed, contain no legal rules or deadlines, and stay `draft` until a
 * content reviewer evaluates and publishes them through the workflow.
 */
export interface DraftPackManifest {
  slug: string;
  market: Market;
  title: string;
  sources: { source: SourceInput; version: SourceVersionInput }[];
  content: PackVersionContent;
  cases: EvalCase[];
}

const subdivisionLabel: Record<Market, string> = {
  NG: "state",
  GB: "constituent jurisdiction",
  US: "state",
  EU: "country",
  CN: "legal territory and locality",
};

const formationExclusions: Record<Market, string[]> = {
  NG: ["tax registration", "sector licences", "foreign ownership rules", "state-level permits"],
  GB: ["tax registration", "VAT", "sector licences", "Scotland and Northern Ireland specifics unless subdivision recorded"],
  US: ["federal tax registration", "state tax", "local permits", "securities", "employment"],
  EU: ["any country-specific law until a country pack exists", "VAT", "employment"],
  CN: ["foreign-investment regime", "sector approvals", "Hong Kong and Macau", "tax"],
};

function baseRules(market: Market, directorySlugs: string[]): PackVersionContent["rules"] {
  const label = subdivisionLabel[market];
  return [
    {
      id: "confirm-registration-status",
      category: "formation",
      priority: 1,
      action: "Confirm registration status and record the official registration evidence",
      applies: [{ fact: "registration_status", op: "neq", value: "registered" }],
      reasonWhenYes: "You recorded the business as {registration_status}, so confirming and evidencing registration is the first step.",
      reasonWhenNo: "You recorded the business as registered; the registration steps do not apply.",
      reasonWhenUnknown: "Registration status is not recorded yet; this is the first fact to settle.",
      gather: ["Official registration record if any", "Registration number"],
      prerequisites: [],
      sourceSlugs: directorySlugs,
      followUpFacts: ["formation_country"],
    },
    {
      id: "locate-official-registration-route",
      category: "formation",
      priority: 1,
      action: `Open the official registration directory and identify the route for your ${label}`,
      applies: [
        { fact: "registration_status", op: "in", value: ["not_registered", "in_progress"] },
        { fact: "formation_country", op: "eq", value: market },
      ],
      reasonWhenYes: `The business is {registration_status} and formed in this market, so the official directory linked below is your starting point. Requirements vary by ${label}; confirm yours before relying on any procedure.`,
      reasonWhenNo: "This step applies only to unregistered businesses formed in this market.",
      reasonWhenUnknown: "Registration status or formation location is not recorded, so the route cannot be identified.",
      gather: ["Proposed business name(s)", "Founder identity details", "Business address", "Plain description of activities"],
      prerequisites: ["confirm-registration-status"],
      sourceSlugs: directorySlugs,
      followUpFacts: ["formation_subdivision", "legal_form"],
    },
    {
      id: "record-subdivision",
      category: "formation",
      priority: 2,
      action: `Record the exact ${label} so subdivision-specific guidance can be selected later`,
      applies: [{ fact: "formation_country", op: "eq", value: market }],
      reasonWhenYes: `Requirements in this market differ by ${label}. Your recorded ${label} is: {formation_subdivision}.`,
      reasonWhenNo: "The business is not formed in this market.",
      reasonWhenUnknown: "Formation location is not recorded.",
      gather: [`The ${label} as it appears on official records or your intended formation location`],
      prerequisites: [],
      sourceSlugs: directorySlugs,
      followUpFacts: ["formation_subdivision"],
    },
    {
      id: "prepare-adviser-questions",
      category: "review",
      priority: 3,
      action: "Prepare questions for a professional adviser from your open unknowns",
      applies: [{ fact: "formation_country", op: "eq", value: market }],
      reasonWhenYes: "Unknown facts (legal form: {legal_form}; licence needed: {regulated_activity}) are questions for a qualified adviser in this market, not conclusions this tool can draw.",
      reasonWhenNo: "The business is not formed in this market.",
      reasonWhenUnknown: "Formation location is not recorded.",
      gather: ["Preparation brief export", "Any correspondence with the registrar"],
      prerequisites: [],
      sourceSlugs: directorySlugs,
      followUpFacts: [],
    },
  ];
}

function baseCases(market: Market): EvalCase[] {
  return [
    {
      id: `${market.toLowerCase()}-unregistered-normal`,
      title: "Unregistered business in this market",
      kind: "normal",
      facts: { registration_status: { state: "answered", value: "not_registered" }, formation_country: { state: "answered", value: market }, formation_subdivision: { state: "answered", value: "Recorded" } },
      expected: { "confirm-registration-status": "yes", "locate-official-registration-route": "yes", "record-subdivision": "yes", "prepare-adviser-questions": "yes" },
      unacceptableClaims: ["must register within", "is required by law", "compliant"],
    },
    {
      id: `${market.toLowerCase()}-registered-normal`,
      title: "Registered business is not sent back to registration",
      kind: "normal",
      facts: { registration_status: { state: "answered", value: "registered" }, formation_country: { state: "answered", value: market } },
      expected: { "confirm-registration-status": "no", "locate-official-registration-route": "no", "record-subdivision": "yes" },
      unacceptableClaims: ["compliant"],
    },
    {
      id: `${market.toLowerCase()}-missing-status`,
      title: "Registration status unknown yields unknown, not a guess",
      kind: "missing_information",
      facts: { formation_country: { state: "answered", value: market }, registration_status: { state: "unknown" } },
      expected: { "confirm-registration-status": "unknown", "locate-official-registration-route": "unknown" },
      unacceptableClaims: [],
    },
    {
      id: `${market.toLowerCase()}-out-of-scope`,
      title: "Business formed elsewhere is out of scope",
      kind: "out_of_scope",
      facts: { registration_status: { state: "answered", value: "not_registered" }, formation_country: { state: "answered", value: market === "NG" ? "GB" : "NG" } },
      expected: { "locate-official-registration-route": "no", "record-subdivision": "no", "prepare-adviser-questions": "no" },
      unacceptableClaims: [],
    },
  ];
}

export const draftPackManifests: DraftPackManifest[] = (["NG", "GB", "US", "EU", "CN"] as Market[]).map((market) => {
  const sources = officialSources.filter((s) => s.market === market);
  const slugs = sources.map((s) => s.id);
  return {
    slug: `${market.toLowerCase()}-formation-starter`,
    market,
    title: `${market} formation preparation (draft)`,
    sources: sources.map((s) => ({
      source: { slug: s.id, market, authority: s.authority, title: s.title, kind: s.kind, permittedUse: "Link and cite as an official directory; do not reproduce page content." },
      version: { url: s.url, language: "en", effectiveFrom: null, effectiveTo: null, checkedAt: s.checkedAt, excerpt: "", locator: "Landing page" },
    })),
    content: {
      subdivisions: [],
      matterTypes: ["formation"],
      entityTypes: [],
      excludedTopics: formationExclusions[market],
      languages: ["en"],
      capabilities: ["information_collection", "official_links", "reviewed_checklist"],
      sourceRefs: slugs.map((slug) => ({ slug, versionId: null })),
      rules: baseRules(market, slugs),
      templates: [],
      effectiveFrom: null,
      effectiveTo: null,
      reviewDueAt: null,
      notes: "Bootstrap draft generated from official directory pointers. Generic preparation steps only; a content reviewer must verify, add jurisdiction-specific sources and publish through the workflow.",
    },
    cases: baseCases(market),
  };
});
