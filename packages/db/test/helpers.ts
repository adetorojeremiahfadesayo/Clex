import pg from "pg";
import { withActor } from "../src/tenant";
import { createUser } from "../src/repositories/users";
import { createCompanyWithOwner } from "../src/repositories/companies";

export const hasDb = !!process.env.TEST_APP_DATABASE_URL;

export function pools() {
  return {
    admin: new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 }),
    app: new pg.Pool({ connectionString: process.env.TEST_APP_DATABASE_URL, max: 4 }),
    worker: new pg.Pool({ connectionString: process.env.TEST_WORKER_DATABASE_URL, max: 2 }),
  };
}

let counter = 0;
export async function makeTenant(app: pg.Pool, label: string) {
  counter += 1;
  const user = await withActor(app, null, (db) =>
    createUser(db, { email: `${label}-${counter}-${Date.now()}@example.test`, displayName: label, password: "correct-horse-battery" }),
  );
  const company = await withActor(app, user.id, (db) =>
    createCompanyWithOwner(db, { name: `${label} Ltd`, lifecycleStage: "registered" }),
  );
  return { user, company };
}
