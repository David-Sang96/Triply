import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

import { loadDatabaseEnv } from "./db-env.mjs";

// Applies pending versioned migrations from ./drizzle to Neon. Unlike
// `db:push`, this ALTERS the schema instead of recreating tables, so existing
// data is preserved. Workflow: edit schema.ts -> `npm run db:generate` ->
// `npm run db:migrate`.
//
// Targets the dev branch by default; `npm run db:migrate:prod` targets
// production. See scripts/db-env.mjs.
const { label, endpoint } = loadDatabaseEnv();
console.log(`target     ${label}  endpoint ${endpoint}`);

const db = drizzle(neon(process.env.DATABASE_URL));

await migrate(db, { migrationsFolder: "./drizzle" });
console.log(`✅ Migrations applied to ${label}.`);
