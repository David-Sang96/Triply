import "dotenv/config";

import { readdirSync } from "node:fs";

import { neon } from "@neondatabase/serverless";

// Read-only pre-deploy check. Confirms DATABASE_URL actually connects, and
// compares the migrations recorded in the database against the files in
// ./drizzle. Writes nothing, so it is safe to run against production.
//
// Reads .env (via dotenv), same as db:migrate and drizzle.config.ts — note that
// the Expo app reads .env.local instead, so a rotated password has to be
// updated in both files.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env)");
}

const sql = neon(process.env.DATABASE_URL);

const [{ now, user }] = await sql`
  SELECT now() AS now, current_user AS user
`;
console.log(`connected  ok as ${user}`);
console.log(`           server time ${now.toISOString()}`);

const files = readdirSync("./drizzle").filter((f) => f.endsWith(".sql"));

// drizzle-kit records one row per applied migration. A missing table means the
// database has never had migrations applied (or was created with db:push).
let applied;
try {
  applied = await sql`
    SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at
  `;
} catch {
  console.log(`migrations NONE recorded, ${files.length} files on disk`);
  console.log("           run: npm run db:baseline (existing db) or db:migrate");
  process.exit(1);
}

console.log(`migrations ${applied.length} applied, ${files.length} files on disk`);
if (applied.length < files.length) {
  const pending = files.length - applied.length;
  console.log(`           ${pending} PENDING -> run: npm run db:migrate`);
} else {
  console.log("           up to date");
}

const [{ count }] = await sql`SELECT count(*)::int AS count FROM users`;
console.log(`users      ${count} rows`);
