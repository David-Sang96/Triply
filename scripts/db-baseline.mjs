import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { readMigrationFiles } from "drizzle-orm/migrator";

// ONE-TIME baseline for adopting migrations on a database that already has the
// schema (created earlier via `db:push`). It records the existing migration(s)
// as already-applied WITHOUT running their SQL, so `db:migrate` won't try to
// re-create tables — and your current data is preserved. Uses drizzle's own
// hashing (readMigrationFiles) so the records match what the migrator expects.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env)");
}

const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
if (migrations.length === 0) {
  console.error("No migrations found. Run `npm run db:generate` first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
)`;

let recorded = 0;
for (const m of migrations) {
  const existing = await sql`
    SELECT id FROM drizzle.__drizzle_migrations WHERE hash = ${m.hash}`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${m.hash}, ${m.folderMillis})`;
    recorded += 1;
  }
}

console.log(`✅ Baseline complete. Recorded ${recorded} migration(s) as already-applied.`);
console.log(
  "Existing tables and data are preserved. From now on, `npm run db:migrate` applies only NEW migrations.",
);
