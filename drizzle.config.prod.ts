import { config } from "dotenv";

import { defineConfig } from "drizzle-kit";

// Production variant of drizzle.config.ts, used only by `npm run db:studio:prod`
// (`drizzle-kit studio --config drizzle.config.prod.ts`).
//
// The default config reads `.env`, which holds the dev Neon branch. This one
// reads `.env.production`. Keeping them as separate files means opening Studio
// against production is a deliberate, differently-named command rather than
// something a stray environment variable can cause.
// `override: true` for the same reason as scripts/db-env.mjs: dotenv leaves
// already-set variables alone by default, so an exported DATABASE_URL would win
// and Studio would open a database this file did not choose.
config({ path: ".env.production", override: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set in .env.production — see .env.example.",
  );
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
