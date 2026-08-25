import { and, eq, sql } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { days, trips } from "@/server/db/schema";
import { inngest } from "@/server/inngest/client";
import { MAX_TRIPS, TRIP_LIMIT_MESSAGE } from "@/server/limits";
import { captureServerError } from "@/server/sentry";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(): Response {
  return Response.json({ error: "Not found" }, { status: 404 });
}

// POST /trips/:id/retry — re-run generation for a trip that failed.
//
// Before this existed the Retry button sent the user back to the create screen,
// which made a *different* trip: the original stayed in the list as a dead row
// and the user had to type the destination, dates and interests again. This
// re-uses the parameters already stored on the row, so retrying costs one tap.
export async function POST(request: Request, { id }: Record<string, string>) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) return notFound();

  // Read first, so "you don't own this" and "this isn't failed" get different
  // answers. The guarded UPDATE below cannot tell those apart on its own — it
  // returns no row for both, and for a full cap as well.
  const [existing] = await db
    .select({ status: trips.status })
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .limit(1);

  if (!existing) return notFound();
  if (existing.status !== "failed") {
    return Response.json(
      {
        error: "This trip isn't in a failed state, so there's nothing to retry.",
        code: "NOT_FAILED",
      },
      { status: 409 },
    );
  }

  // Clear any half-written itinerary before re-queuing. In practice a failed
  // trip has no days — `finalize` writes them in the same batch that flips the
  // status to ready — but the insert there is a plain INSERT with a unique
  // constraint on (trip_id, day_number), so a single leftover row would make
  // every future retry fail on the constraint instead of on the real problem.
  // Activities cascade from days. Done before the status flips, so a failure
  // here leaves the trip exactly as it was rather than queued with no job.
  await db.delete(days).where(eq(days.tripId, id));

  // Re-check the cap in the same statement that flips the status, for the same
  // reason POST /trips does it (see the comment there: the neon-http driver has
  // no interactive transactions). This matters more here than on create: a
  // failed trip has counts_against_cap = false, so a user sitting at 5 good
  // trips plus 1 failed one would otherwise retry their way to 6.
  //
  // The subquery is aliased and uses raw column names on purpose — `${trips.x}`
  // renders a table-qualified "trips"."x", which would not resolve against the
  // alias.
  const result = await db.execute<{ id: string }>(sql`
    UPDATE ${trips}
    SET status = 'queued', error_message = NULL, counts_against_cap = true
    WHERE ${trips.id} = ${id}
      AND ${trips.userId} = ${userId}
      AND ${trips.status} = 'failed'
      AND (
        SELECT count(*) FROM ${trips} AS capped
        WHERE capped.user_id = ${userId}
          AND capped.counts_against_cap = true
          AND capped.status <> 'failed'
      ) < ${MAX_TRIPS}
    RETURNING id
  `);

  if (!result.rows[0]) {
    // The row exists and was failed a moment ago, so the cap is what stopped it.
    return Response.json(
      { error: TRIP_LIMIT_MESSAGE, code: "TRIP_LIMIT_REACHED" },
      { status: 409 },
    );
  }

  try {
    await inngest.send({ name: "trip/requested", data: { tripId: id } });
  } catch (err) {
    console.error("Failed to dispatch trip/requested on retry:", err);
    // Same reasoning as POST /trips: a trip that never reaches the queue never
    // fails a generation either, so generateTrip's onFailure will not report it.
    await captureServerError(err, {
      failure_kind: "trip_dispatch_failed",
      route: "POST /api/trips/[id]/retry",
      status: 502,
      tags: { trip_id: id, is_retry: true },
    });
    // Put the row back the way we found it, cap exemption included, so a failed
    // retry does not quietly consume one of the user's five slots.
    await db
      .update(trips)
      .set({
        status: "failed",
        // A code, not prose — the app renders it in the active language.
        errorCode: "enqueue_failed",
        errorMessage: null,
        countsAgainstCap: false,
      })
      .where(eq(trips.id, id));
    return Response.json(
      { error: "Couldn't restart your trip. Please try again." },
      { status: 502 },
    );
  }

  return Response.json({ id });
}
