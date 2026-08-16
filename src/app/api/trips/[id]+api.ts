import { and, eq } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { trips } from "@/server/db/schema";
import { deleteCoverImage } from "@/server/imagekit";
import { captureServerError } from "@/server/sentry";

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
    .returning({ id: trips.id, customCoverImageFileId: trips.customCoverImageFileId });

  if (!deleted) return notFound();

  // Best-effort: the trip is already gone from the DB either way, so a
  // failure to clean up its custom cover (e.g. ImageKit briefly down)
  // shouldn't turn a successful delete into an error response.
  if (deleted.customCoverImageFileId) {
    try {
      await deleteCoverImage(deleted.customCoverImageFileId);
    } catch (err) {
      console.error("Failed to delete trip's cover from ImageKit:", err);
      // The trip row is gone but its image is not, so nothing will ever
      // reference or retry this file. That is a leak against the privacy policy
      // as much as against storage cost: the user deleted their trip.
      await captureServerError(err, {
        failure_kind: "cover_delete_orphaned",
        route: "DELETE /api/trips/[id]",
        tags: { trip_id: id, file_id: deleted.customCoverImageFileId },
      });
    }
  }

  return Response.json({ ok: true });
}
