import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createCompanyWithOwner, createMatter, createMatterAnalysis, createMatterDocument, createMatterDraft, listCompanies } from "@lex/db";
import { handle, requireUser } from "@/lib/api";
import { asActor } from "@/lib/db";
import { confirmAnswersAndAssess } from "@/lib/company-start";
import { prepareMatter } from "@/lib/matter-analysis";

const demoName = "LexHack Demo Bakery";
const sampleAgreement = `SYNTHETIC SAMPLE — NOT A REAL AGREEMENT\n\nDemo Flour Co will deliver flour to LexHack Demo Bakery every Monday. Payment is due within 7 days of invoice. Either party may terminate on 30 days' notice. This agreement is governed by the law of England and Wales.\n`;

/** Each judge receives an isolated, persistent copy. No shared guest session or public tenant ID. */
export const POST = handle(async (request: Request) => {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: { code: "invalid_origin", message: "Open the demo from this site" } }, { status: 403 });
  }
  const user = await requireUser();
  const companyId = await asActor(user.id, async (db) => {
    const existing = (await listCompanies(db)).find((company) => company.name === demoName);
    if (existing) return existing.id;

    const company = await createCompanyWithOwner(db, { name: demoName, lifecycleStage: "pre_registration" });
    const { revision } = await confirmAnswersAndAssess(db, {
      companyId: company.id,
      actorId: user.id,
      reason: "Synthetic judge demo profile",
      answers: {
        registration_status: { state: "answered", value: "not_registered" },
        legal_form: { state: "answered", value: "private_company" },
        formation_country: { state: "answered", value: "NG" },
        formation_subdivision: { state: "answered", value: "Lagos" },
        operating_locations: { state: "answered", value: "Lagos, Nigeria" },
        industry: { state: "answered", value: "Food and beverage" },
        activities: { state: "answered", value: "Bakes bread for local cafes" },
        customer_type: { state: "answered", value: "b2b" },
        founder_count: { state: "answered", value: 2 },
        employee_count: { state: "answered", value: 0 },
        has_suppliers: { state: "answered", value: "yes" },
        current_priority: { state: "answered", value: "Review a flour supply agreement before signing" },
      },
    });
    const matter = await createMatter(db, company.id, user.id, {
      kind: "supplier",
      title: "Flour supply agreement",
      summary: "Check a proposed monthly supply arrangement before signing.",
      context: {
        counterparty: "Demo Flour Co",
        deliverables: "Flour deliveries every Monday",
        payment: "Net 30 days after accepted delivery",
        dataAccess: "No customer data",
      },
    }, revision.id);
    const bytes = Buffer.from(sampleAgreement, "utf8");
    const document = await createMatterDocument(db, {
      companyId: company.id,
      matterId: matter.id,
      filename: "synthetic-flour-agreement.txt",
      mimeType: "text/plain",
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      extractedText: sampleAgreement,
      extractionStatus: "readable",
      actorId: user.id,
    });
    const output = prepareMatter(matter, revision.facts, document);
    await createMatterAnalysis(db, {
      companyId: company.id,
      matterId: matter.id,
      documentId: document.id,
      profileRevisionId: revision.id,
      mode: "preparation",
      status: "needs_review",
      findings: output.findings,
      questions: output.questions,
      actorId: user.id,
    });
    await createMatterDraft(db, company.id, matter.id,
      `WORKING DRAFT — NOT REVIEWED BY A LAWYER\n\nFlour supply agreement\nCompany: ${demoName}\nCounterparty: Demo Flour Co\n\nDelivery: Flour every Monday.\nPayment: Net 30 days after accepted delivery.\n\nOpen for review: The synthetic sample says payment within 7 days and names England and Wales as governing law. Confirm the intended terms and jurisdiction with counsel before signing.`,
      user.id);
    return company.id;
  });
  return NextResponse.json({ companyId, url: `/companies/${companyId}/overview` });
});
