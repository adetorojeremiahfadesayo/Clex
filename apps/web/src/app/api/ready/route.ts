import { NextResponse } from "next/server";
import { liveModelConfigured } from "@lex/domain";
import { appPool } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const e = env();
    const { rows } = await appPool().query<{ count: string }>("select count(*)::text as count from schema_migrations");
    return NextResponse.json({
      status: "ready",
      database: "ok",
      migrations: Number(rows[0]?.count ?? 0),
      mode: liveModelConfigured(e) ? "live_model" : e.DEMO_MODE ? "synthetic_demo" : "no_model_configured",
    });
  } catch (error) {
    return NextResponse.json({ status: "unavailable", database: "error", message: (error as Error).message }, { status: 503 });
  }
}
