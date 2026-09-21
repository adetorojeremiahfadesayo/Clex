import { NextResponse } from "next/server";
import { signInInputSchema } from "@lex/domain";
import { findUserByEmail, verifyPassword } from "@lex/db";
import { ApiError, handle, parseBody } from "@/lib/api";
import { asActor } from "@/lib/db";
import { startSession } from "@/lib/session";

export const POST = handle(async (request: Request) => {
  const input = await parseBody(request, signInInputSchema);
  const user = await asActor(null, (db) => findUserByEmail(db, input.email));
  const ok = user ? await verifyPassword(input.password, user.password_hash) : false;
  if (!user || !ok) throw new ApiError(401, "invalid_credentials", "Email or password is incorrect");
  await startSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
});
