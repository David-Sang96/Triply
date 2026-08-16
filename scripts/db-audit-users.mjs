import { createClerkClient } from "@clerk/backend";
import { neon } from "@neondatabase/serverless";

import { loadDatabaseEnv } from "./db-env.mjs";

// Read-only audit. Writes nothing, so it is safe against production.
//
// Why this exists: the production `users` table has two rows for the same email
// address — twice. That looks like a Clerk account-linking problem, but Clerk
// treats one email as one person and links a verified OAuth email to an existing
// account automatically, so it cannot normally produce two users for one email.
//
// The likely cause is instead that rows were written by TWO DIFFERENT Clerk
// instances: the development instance while the app pointed at the production
// database. Clerk user ids are per-instance, so rows from the other instance
// look exactly like duplicate emails and can never be merged by any dashboard
// setting. The env key shadowing that allowed it was fixed on 4 Aug.
//
// This checks that directly: every `users.id` is looked up in the Clerk instance
// that the loaded CLERK_SECRET_KEY belongs to. A row whose id is not found there
// belongs to some other instance (or was deleted in Clerk).
//
// It DELETES NOTHING. `users.id` is referenced with `onDelete: "cascade"` by
// trips, chat_conversations and chat_messages, so removing a user row also
// destroys their trips, days, activities and chats. So the audit reports what
// each unmatched row owns and leaves the decision to a human.
const { label, file, endpoint } = loadDatabaseEnv();
console.log(`target     ${label} (${file})  endpoint ${endpoint}`);

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) {
  throw new Error(`CLERK_SECRET_KEY is not set in ${file}`);
}

// The key prefix names the instance, and a mismatch with the database target is
// the exact condition being investigated — so say it out loud rather than
// assuming the file name is the truth.
const instance = secretKey.startsWith("sk_live_")
  ? "PRODUCTION"
  : secretKey.startsWith("sk_test_")
    ? "development"
    : "unrecognised";
console.log(`clerk      ${instance} instance (from CLERK_SECRET_KEY prefix)`);
// Stop rather than warn. On a mismatch every row is reported as missing from
// Clerk, which reads as "these are all orphans, delete them" — and deleting
// cascades to trips and chats. A warning above a convincing-looking list is not
// enough protection for an irreversible action, so refuse to print the list.
if (
  (label === "PRODUCTION" && instance !== "PRODUCTION") ||
  (label === "dev" && instance === "PRODUCTION")
) {
  console.error(
    `\nSTOPPING: the database is ${label} but CLERK_SECRET_KEY belongs to the ` +
      `${instance} instance.\n` +
      `Every row would look orphaned, and acting on that would delete real ` +
      `users' trips and chats.\n` +
      `Fix CLERK_SECRET_KEY in ${file} (Clerk dashboard -> the ${label} ` +
      `instance -> API keys), then run this again.`,
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const clerk = createClerkClient({ secretKey });

const rows = await sql`
  SELECT id, email, name, created_at FROM users ORDER BY created_at
`;
console.log(`users      ${rows.length} rows\n`);

const found = [];
const missing = [];

for (const row of rows) {
  try {
    await clerk.users.getUser(row.id);
    found.push(row);
  } catch (err) {
    // 404 means this id does not exist in this instance — the signal we want.
    // Anything else (network, bad key, rate limit) is not evidence, so it must
    // not be reported as an orphan.
    const status = err?.status ?? err?.statusCode;
    if (status === 404) {
      missing.push(row);
    } else {
      console.error(
        `lookup failed for ${row.id} (status ${status ?? "unknown"}) — ` +
          "treating as UNKNOWN, not orphaned",
      );
      console.error(String(err?.message ?? err));
      process.exitCode = 1;
    }
  }
}

console.log(`in Clerk   ${found.length}`);
console.log(`NOT found  ${missing.length}\n`);

// Duplicate emails are the symptom that prompted this, so show them with the
// in-Clerk status attached — that is what tells you which row is the real one.
const byEmail = new Map();
for (const row of rows) {
  const key = row.email.trim().toLowerCase();
  byEmail.set(key, [...(byEmail.get(key) ?? []), row]);
}

const duplicated = [...byEmail.entries()].filter(([, list]) => list.length > 1);
if (duplicated.length === 0) {
  console.log("No email appears more than once.");
} else {
  console.log(`Emails with more than one row: ${duplicated.length}`);
  for (const [email, list] of duplicated) {
    console.log(`\n  ${email}`);
    for (const row of list) {
      const state = missing.some((m) => m.id === row.id)
        ? "NOT in Clerk"
        : "in Clerk";
      console.log(
        `    ${row.id}  ${row.created_at.toISOString().slice(0, 10)}  ` +
          `${(row.name ?? "(no name)").padEnd(14)}  ${state}`,
      );
    }
  }
}

if (missing.length === 0) {
  console.log("\nNothing to clean up.");
  process.exit(process.exitCode ?? 0);
}

// What each unmatched row owns. Deleting the row cascades to all of it, so this
// is the number that decides whether deletion is acceptable.
console.log("\nWhat the rows NOT in Clerk own (cascade would delete this):");
let totalOwned = 0;
for (const row of missing) {
  const [{ trips, conversations, messages }] = await sql`
    SELECT
      (SELECT count(*)::int FROM trips WHERE user_id = ${row.id}) AS trips,
      (SELECT count(*)::int FROM chat_conversations WHERE user_id = ${row.id}) AS conversations,
      (SELECT count(*)::int FROM chat_messages WHERE user_id = ${row.id}) AS messages
  `;
  totalOwned += trips + conversations + messages;
  console.log(
    `  ${row.id}  ${row.email}\n` +
      `    trips ${trips}  conversations ${conversations}  messages ${messages}`,
  );
}

console.log(
  `\nTotal owned rows at risk: ${totalOwned}.\n` +
    (totalOwned === 0
      ? "None of them own anything, so deleting them loses no data."
      : "Some of them own data. Deleting cascades and it is NOT recoverable."),
);
console.log(
  "\nThis script does not delete. To remove one row after deciding, run it\n" +
    "yourself against the intended database, one id at a time:\n" +
    "  DELETE FROM users WHERE id = '<clerk_user_id>';",
);
