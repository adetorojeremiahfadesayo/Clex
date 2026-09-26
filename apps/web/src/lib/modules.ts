import type { MatterKind } from "@lex/domain";

export interface ModuleSample {
  conversation: { source: "slack" | "gmail"; text: string };
  document?: { filename: string; text: string };
}

export interface CompanyModule {
  id: string;
  title: string;
  kind: MatterKind;
  blurb: string;
  asks: string[];
  accent: "emerald" | "orange" | "violet" | "blue" | "gold" | "rose" | "slate";
  sample: ModuleSample;
}

const note = "SYNTHETIC SAMPLE — NOT A REAL CONVERSATION OR AGREEMENT";

/** Areas a running company usually needs to keep in order. Samples are synthetic demo data only. */
export const companyModules: CompanyModule[] = [
  {
    id: "contracts",
    title: "Contracts & suppliers",
    kind: "supplier",
    blurb: "Check supplier and customer agreements against what you actually agreed.",
    asks: ["Does this contract match what we agreed on Slack?", "Draft a letter asking for changes"],
    accent: "emerald",
    sample: {
      conversation: {
        source: "slack",
        text: `${note}
#suppliers — Slack export

Ada (Clex Demo Bakery): Hi Tunde, confirming we agreed payment 30 days after each delivery.
Tunde (Demo Flour Co): Yes, 30 days is fine for us.
Ada (Clex Demo Bakery): Great. We also need you to cover any spoiled flour.
Tunde (Demo Flour Co): I'll send the contract by Friday.
Ada (Clex Demo Bakery): Please keep it under Nigerian law, we are in Lagos.`,
      },
      document: {
        filename: "flour-supply-agreement.txt",
        text: `${note}

Flour supply agreement between Demo Flour Co and Clex Demo Bakery.

1. Deliverables. Demo Flour Co will deliver 200kg of flour every Monday.
2. Payment. Payment is due within 7 days of invoice.
3. Termination. Either party may terminate on 30 days' notice.
4. Limitation of liability. The supplier's total liability is capped at the fees paid in the previous month.
5. Governing law. This agreement is governed by the law of England and Wales.`,
      },
    },
  },
  {
    id: "hiring",
    title: "Hiring & employment",
    kind: "employment",
    blurb: "Offer letters, contractor agreements and what was promised in interviews.",
    asks: ["What did we promise this candidate?", "Draft an offer letter update"],
    accent: "orange",
    sample: {
      conversation: {
        source: "gmail",
        text: `${note}
Gmail thread: "Head baker offer"

From: Ada <ada@demo-bakery.example>
To: Chioma <chioma@example.com>
Hi Chioma, as discussed we will pay a monthly salary of 450,000 NGN and you will start on 1 November.
You can work 4 days a week from the Lagos kitchen.

From: Chioma <chioma@example.com>
Thanks Ada! Can you confirm the probation period is 3 months, and that my recipes stay mine?`,
      },
      document: {
        filename: "offer-letter-draft.txt",
        text: `${note}

Offer of employment: Head Baker, Clex Demo Bakery.

Salary: 400,000 NGN per month.
Hours: 5 days per week.
Probation period: 6 months.
Intellectual property: All recipes and work product created during employment belong to the company.
Termination: Either party may terminate on 2 weeks' notice.`,
      },
    },
  },
  {
    id: "privacy",
    title: "Data & privacy",
    kind: "other",
    blurb: "Customer data, mailing lists, and what your team shares with suppliers.",
    asks: ["Are we sharing customer data we shouldn't?", "Draft a note to our team"],
    accent: "violet",
    sample: {
      conversation: {
        source: "slack",
        text: `${note}
#marketing — Slack export

Bola: I exported all customer names, phone numbers and addresses to a spreadsheet.
Bola: I'll send it to the new delivery app so they can text customers.
Ada: Do we have a contract with the delivery app yet?
Bola: Not yet, they said we can sign later.`,
      },
    },
  },
  {
    id: "tax",
    title: "Tax & filings",
    kind: "other",
    blurb: "Keep track of returns, invoices and what your accountant asked for.",
    asks: ["What is our accountant waiting on?", "Draft a reply to the accountant"],
    accent: "blue",
    sample: {
      conversation: {
        source: "gmail",
        text: `${note}
Gmail thread: "Year-end documents"

From: Accountant <books@example.com>
Hi Ada, please send the bank statements, supplier invoices and payroll records by 15 January.
We also need to confirm whether you registered for VAT.

From: Ada
Thanks, I'm not sure about VAT. I'll check.`,
      },
    },
  },
  {
    id: "licences",
    title: "Licences & permits",
    kind: "other",
    blurb: "Premises, food, trade and sector permits you may need to hold or renew.",
    asks: ["Which permits came up in our chats?", "Draft an enquiry to the regulator"],
    accent: "gold",
    sample: {
      conversation: {
        source: "slack",
        text: `${note}
#operations — Slack export

Ada: The landlord asked if we have a food handling permit for the new kitchen.
Kunle: I think the old one only covered the first location.
Ada: Can someone check before we open on the 3rd?`,
      },
    },
  },
  {
    id: "governance",
    title: "Board & shareholders",
    kind: "other",
    blurb: "Founder decisions, share promises, and records you should keep.",
    asks: ["What decisions need recording?", "Draft board minutes"],
    accent: "rose",
    sample: {
      conversation: {
        source: "slack",
        text: `${note}
#founders — Slack export

Ada: I told our first investor they'd get 10% for the 5 million NGN.
Femi: I thought we said 8%? We should put it in writing.
Ada: Agreed. Also we decided to open the second kitchen, can we record that?`,
      },
    },
  },
  {
    id: "ip",
    title: "Brand & IP",
    kind: "other",
    blurb: "Your name, logo, recipes and content, and who actually owns them.",
    asks: ["Who owns our logo and recipes?", "Draft an ownership confirmation"],
    accent: "slate",
    sample: {
      conversation: {
        source: "gmail",
        text: `${note}
Gmail thread: "Logo files"

From: Designer <studio@example.com>
Here are the final logo files. As a freelancer I keep the rights, but you can use them.

From: Ada
Oh, I assumed we would own the logo since we paid for it?`,
      },
    },
  },
];

export const moduleById = (id: string | undefined) => companyModules.find((m) => m.id === id);
