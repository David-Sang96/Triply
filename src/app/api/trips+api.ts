import { and, count, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { budgetLevel, trips } from "@/server/db/schema";
import { inngest } from "@/server/inngest/client";

const MAX_TRIPS = 5;

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

  // Cap check: only non-failed trips that count against the cap.
  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(trips)
    .where(
      and(
        eq(trips.userId, userId),
        eq(trips.countsAgainstCap, true),
        ne(trips.status, "failed"),
      ),
    );

  if (activeCount >= MAX_TRIPS) {
    return Response.json(
      {
        error: `You've reached the limit of ${MAX_TRIPS} trips. Delete one to plan a new trip.`,
        code: "TRIP_LIMIT_REACHED",
      },
      { status: 409 },
    );
  }

  const [trip] = await db
    .insert(trips)
    .values({
      userId,
      destination: input.destination,
      numDays: input.numDays,
      numTravelers: input.numTravelers,
      budgetLevel: input.budgetLevel,
      interests: input.interests,
      pace: input.pace ?? null,
      status: "queued",
    })
    .returning({ id: trips.id });

  await inngest.send({ name: "trip/requested", data: { tripId: trip.id } });

  return Response.json({ id: trip.id }, { status: 201 });
}
