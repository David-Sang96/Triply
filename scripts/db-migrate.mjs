import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// Applies pending versioned migrations from ./drizzle to Neon. Unlike
// `db:push`, this ALTERS the schema instead of recreating tables, so existing
// data is preserved. Workflow: edit schema.ts -> `npm run db:generate` ->
// `npm run db:migrate`.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env)");
}

const db = drizzle(neon(process.env.DATABASE_URL));

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("✅ Migrations applied.");
