import { and, eq } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { trips } from "@/server/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(): Response {
  return Response.json({ error: "Not found" }, { status: 404 });
}

// GET /trips/:id — one trip with its days and activities (owner only).
export async function GET(request: Request, { id }: Record<string, string>) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) return notFound();

  const trip = await db.query.trips.findFirst({
    where: and(eq(trips.id, id), eq(trips.userId, userId)),
    with: {
      days: {
        orderBy: (d, { asc }) => [asc(d.dayNumber)],
        with: {
          activities: {
            orderBy: (a, { asc }) => [asc(a.sortOrder)],
          },
        },
      },
    },
  });

  if (!trip) return notFound();
  return Response.json({ trip });
}

// DELETE /trips/:id — remove a trip (days + activities cascade).
export async function DELETE(request: Request, { id }: Record<string, string>) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) return notFound();

  const [deleted] = await db
    .delete(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .returning({ id: trips.id });

  if (!deleted) return notFound();
  return Response.json({ ok: true });
}
