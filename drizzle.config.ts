import "dotenv/config";

import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a standalone Node CLI (not through Expo), so it does not
// see Expo's env loading — `dotenv/config` above loads DATABASE_URL from .env,
// which holds the **dev** Neon branch.
//
// For production there is drizzle.config.prod.ts, reading .env.production, used
// by `npm run db:studio:prod`. `db:generate` needs no database at all — it only
// reads schema.ts and writes SQL — so it has no production variant.
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
