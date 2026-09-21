import { NextResponse } from "next/server";
import { signUpInputSchema } from "@lex/domain";
import { EmailTakenError, createUser } from "@lex/db";
import { ApiError, handle, parseBody } from "@/lib/api";
import { asActor } from "@/lib/db";
import { startSession } from "@/lib/session";

export const POST = handle(async (request: Request) => {
  const input = await parseBody(request, signUpInputSchema);
  try {
    const user = await asActor(null, (db) => createUser(db, input));
    await startSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.display_name } }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailTakenError) throw new ApiError(409, "email_taken", "That email is already registered");
    throw error;
  }
});
