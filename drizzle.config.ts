import "dotenv/config";

import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a standalone Node CLI (not through Expo), so it does not
// see Expo's env loading — `dotenv/config` above loads DATABASE_URL from .env.
// Dev workflow: `npx drizzle-kit push` applies src/server/db/schema.ts to Neon.
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
