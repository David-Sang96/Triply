import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { readFileSync } from "node:fs";

// ONE-TIME baseline for adopting migrations on a database that already has the
// schema (created earlier via `db:push`). It records the existing migration(s)
// as already-applied WITHOUT running their SQL, so `db:migrate` won't try to
// re-create tables — and your current data is preserved. Uses drizzle's own
// hashing (readMigrationFiles) so the records match what the migrator expects.
//
// Safety: only migrations tagged in BASELINE_UNTIL (the last migration that
// already exists in the live DB) are marked applied. If new, real migrations
// were generated after that point, this refuses to run — they need to reach
// the DB through `npm run db:migrate` like normal, not be silently skipped.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env)");
}

const baselineUntil = process.env.BASELINE_UNTIL;
if (!baselineUntil) {
  console.error(
    "BASELINE_UNTIL is not set. Set it to the tag of the last migration that " +
      "already matches the live DB's schema, e.g.:\n" +
      "  BASELINE_UNTIL=0002_nasty_zarek npm run db:baseline\n" +
      "(see drizzle/meta/_journal.json for the list of tags).",
  );
  process.exit(1);
}

const journal = JSON.parse(
  readFileSync("./drizzle/meta/_journal.json", "utf8"),
);
const cutoffIdx = journal.entries.findIndex((e) => e.tag === baselineUntil);
if (cutoffIdx === -1) {
  console.error(`BASELINE_UNTIL="${baselineUntil}" is not a known migration tag.`);
  process.exit(1);
}
const unexpected = journal.entries.slice(cutoffIdx + 1);
if (unexpected.length > 0) {
  console.error(
    `Refusing to baseline: ${unexpected.length} migration(s) exist after ` +
      `"${baselineUntil}" (${unexpected.map((e) => e.tag).join(", ")}). ` +
      "Those are real schema changes the live DB doesn't have yet — apply " +
      "them with `npm run db:migrate` instead of baselining over them.",
  );
  process.exit(1);
}
// readMigrationFiles() doesn't expose the tag back, only the journal's
// `when` timestamp — match on that instead.
const allowedMillis = new Set(
  journal.entries.slice(0, cutoffIdx + 1).map((e) => e.when),
);

const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" }).filter(
  (m) => allowedMillis.has(m.folderMillis),
);
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
