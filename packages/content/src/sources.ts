import type { Market } from "@lex/domain";

/**
 * Official starting-point directories from docs/JURISDICTION_PACKS.md.
 * These are research pointers found 2026-09-21, not reviewed legal rules.
 */
export interface OfficialSource {
  id: string;
  market: Market;
  title: string;
  authority: string;
  url: string;
  checkedAt: string;
  kind: "official_directory" | "official_procedure";
  status: "research_pointer";
}

export const officialSources: OfficialSource[] = [
  {
    id: "ng-cac-registration",
    market: "NG",
    title: "Company registration services",
    authority: "Corporate Affairs Commission (Nigeria)",
    url: "https://cac.gov.ng/services/company-registration",
    checkedAt: "2026-09-21",
    kind: "official_procedure",
    status: "research_pointer",
  },
  {
    id: "ng-cac-portal",
    market: "NG",
    title: "CAC registration portal",
    authority: "Corporate Affairs Commission (Nigeria)",
    url: "https://icrp.cac.gov.ng/",
    checkedAt: "2026-09-21",
    kind: "official_procedure",
    status: "research_pointer",
  },
  {
    id: "gb-govuk-start",
    market: "GB",
    title: "Set up a business",
    authority: "GOV.UK",
    url: "https://www.gov.uk/browse/business/start-your-business",
    checkedAt: "2026-09-21",
    kind: "official_directory",
    status: "research_pointer",
  },
  {
    id: "us-sba-launch",
    market: "US",
    title: "Launch your business",
    authority: "U.S. Small Business Administration",
    url: "https://www.sba.gov/counseling/launch-your-business/",
    checkedAt: "2026-09-21",
    kind: "official_directory",
    status: "research_pointer",
  },
  {
    id: "eu-youreurope-startups",
    market: "EU",
    title: "Start-ups (Your Europe)",
    authority: "European Union",
    url: "https://europa.eu/youreurope/business/lifecycle/starting/startups/index_en.htm",
    checkedAt: "2026-09-21",
    kind: "official_directory",
    status: "research_pointer",
  },
  {
    id: "cn-gov-doing-business",
    market: "CN",
    title: "Doing business",
    authority: "The State Council of the People's Republic of China (English portal)",
    url: "https://english.www.gov.cn/services/doingbusiness",
    checkedAt: "2026-09-21",
    kind: "official_directory",
    status: "research_pointer",
  },
];

export function sourcesForMarket(market: Market | undefined): OfficialSource[] {
  return market ? officialSources.filter((s) => s.market === market) : [];
}
