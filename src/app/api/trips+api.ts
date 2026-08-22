import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { budgetLevel, trips } from "@/server/db/schema";
import { inngest } from "@/server/inngest/client";
import { MAX_TRIPS, TRIP_LIMIT_MESSAGE } from "@/server/limits";
import { captureServerError } from "@/server/sentry";
import { ensureUser, userSyncUnavailable } from "@/server/users";

const createTripSchema = z.object({
  destination: z.string().trim().min(1).max(120),
  numDays: z.number().int().min(1).max(7),
  numTravelers: z.number().int().min(1).max(10),
  budgetLevel: z.enum(budgetLevel.enumValues),
  interests: z.array(z.string().min(1)).max(10).default([]),
  pace: z.string().min(1).nullable().optional(),
});

// GET /trips — the signed-in user's trips, newest first (list view fields only).
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();

  const rows = await db
    .select({
      id: trips.id,
      destination: trips.destination,
      title: trips.title,
      status: trips.status,
      coverImageUrl: trips.coverImageUrl,
      customCoverImageUrl: trips.customCoverImageUrl,
      useCustomCover: trips.useCustomCover,
      numDays: trips.numDays,
      numTravelers: trips.numTravelers,
      budgetLevel: trips.budgetLevel,
      errorMessage: trips.errorMessage,
      createdAt: trips.createdAt,
    })
    .from(trips)
    .where(eq(trips.userId, userId))
    .orderBy(desc(trips.createdAt));

  return Response.json({ trips: rows });
}

// POST /trips — enforce the 5-trip cap, insert a queued trip, and kick off the
// generateTrip Inngest job. The device never talks to Inngest directly.
export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTripSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // `trips.user_id` is a foreign key to `users.id`, and that row arrives
  // asynchronously via the Clerk webhook. Back-fill it if it has not landed
  // yet, otherwise the insert below fails on the constraint.
  if (!(await ensureUser(userId))) return userSyncUnavailable();

  // Cap check + insert as a single statement (the neon-http driver has no
  // interactive transactions — see src/server/db/index.ts), so two concurrent
  // requests can't both pass a separate "count < cap" check and both insert.
  // The WHERE subquery re-counts at insert time, closing that race.
  //
  // interests is spliced in as ARRAY[...] rather than a bare ${input.interests}
  // — the sql tag turns a raw JS array into a row expression "(a, b, c)", not
  // a Postgres array, and casting a row to text[] is invalid SQL.
  const interestsSql = sql.join(
    input.interests.map((interest) => sql`${interest}`),
    sql`, `,
  );
  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO ${trips} (user_id, destination, num_days, num_travelers, budget_level, interests, pace, status)
    SELECT ${userId}, ${input.destination}, ${input.numDays}, ${input.numTravelers}, ${input.budgetLevel}::budget_level, ARRAY[${interestsSql}]::text[], ${input.pace ?? null}, 'queued'
    WHERE (
      SELECT count(*) FROM ${trips}
      WHERE ${trips.userId} = ${userId} AND ${trips.countsAgainstCap} = true AND ${trips.status} <> 'failed'
    ) < ${MAX_TRIPS}
    RETURNING id
  `);
  const trip = result.rows[0];

  if (!trip) {
    return Response.json(
      {
        error: TRIP_LIMIT_MESSAGE,
        code: "TRIP_LIMIT_REACHED",
      },
      { status: 409 },
    );
  }

  try {
    await inngest.send({ name: "trip/requested", data: { tripId: trip.id } });
  } catch (err) {
    console.error("Failed to dispatch trip/requested:", err);
    // A trip that never reaches the queue never fails a generation either, so
    // generateTrip's onFailure will not report it. Without this, the whole
    // pipeline being down looks like nothing at all.
    await captureServerError(err, {
      failure_kind: "trip_dispatch_failed",
      route: "POST /api/trips",
      status: 502,
      tags: { trip_id: trip.id },
    });
    await db
      .update(trips)
      .set({
        status: "failed",
        errorMessage: "We couldn't start generating this trip. Please try again.",
        countsAgainstCap: false,
      })
      .where(eq(trips.id, trip.id));
    return Response.json(
      { error: "Couldn't start your trip. Please try again." },
      { status: 502 },
    );
  }

  return Response.json({ id: trip.id }, { status: 201 });
}
