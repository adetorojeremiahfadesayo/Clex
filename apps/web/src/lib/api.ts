import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import type { SessionUser } from "@lex/domain";
import { currentUser } from "./session";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function problem(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(422, "validation_failed", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  return parsed.data;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new ApiError(401, "workspace_required", "Open the workspace in this browser first");
  return user;
}

/** Wraps a handler so thrown ApiErrors become JSON problems; other errors are 500 without leaking details. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError) return problem(error.status, error.code, error.message);
      console.error("[api] unhandled", error);
      return problem(500, "internal_error", "Something went wrong");
    }
  };
}
