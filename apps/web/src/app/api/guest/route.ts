import { redirect } from "next/navigation";
import { createGuestUser } from "@lex/db";
import { asActor } from "@/lib/db";
import { currentUser, startSession } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("next") ?? "/";
  const base = new URL("http://lex.local");
  const destination = requested.startsWith("/") ? new URL(requested, base) : base;
  const next = destination.origin === base.origin ? `${destination.pathname}${destination.search}${destination.hash}` : "/";
  if (!(await currentUser())) {
    const guest = await asActor(null, createGuestUser);
    await startSession(guest.id);
  }
  redirect(next);
}
