import { NextResponse } from "next/server";
import { createGuestUser } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser, startSession } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("next") ?? "/";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  if (!(await currentUser())) {
    const guest = await asActor(null, createGuestUser);
    await startSession(guest.id);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
