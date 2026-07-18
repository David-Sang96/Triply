import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// The neon-http driver is HTTP/fetch based, so it is edge- and Cloudflare
// Workers-safe (no TCP sockets, no Node built-ins). Trade-off: no interactive
// transactions — use db.batch() when several writes must go together.
const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
