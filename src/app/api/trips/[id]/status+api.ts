import { and, eq } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { trips } from "@/server/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /trips/:id/status — the polling target. Returns only status (+ a friendly
// error message when failed), so the loading screen stays cheap.
export async function GET(request: Request, { id }: Record<string, string>) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [row] = await db
    .select({
      status: trips.status,
      errorCode: trips.errorCode,
      errorMessage: trips.errorMessage,
    })
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .limit(1);

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    status: row.status,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
  });
}
