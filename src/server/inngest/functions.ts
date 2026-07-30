import { eq } from "drizzle-orm";
import { experiment } from "inngest";

import { generateItinerary, ITINERARY_MODELS } from "@/server/ai/gemini";
import { TIME_OF_DAY } from "@/server/ai/itinerary-schema";
import { isRateLimitError } from "@/server/ai/rate-limit";
import { db } from "@/server/db";
import {
  activities,
  days,
  trips,
  users,
  type TimeOfDay,
} from "@/server/db/schema";
import { getDestinationImages } from "@/server/images";
import { geocodePlace, type GeoResult } from "@/server/places/geocode";

import { inngest } from "./client";

// Payload the Clerk webhook sends for a created or updated user
// (src/app/api/webhooks/clerk+api.ts). Kept flat and limited to what the write
// needs.
type ClerkUserData = {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
};

// Payload the Clerk webhook sends for a deleted user — only the id is needed.
type ClerkUserDeleted = { id: string };

// clerk/user.created → insert the user into Neon.
// Idempotent: Clerk re-deliveries and Inngest step retries both land on
// `onConflictDoNothing`, so the same user is never inserted twice.
export const syncUserCreated = inngest.createFunction(
  {
    id: "sync-user-created",
    triggers: [{ event: "clerk/user.created" }],
  },
  async ({ event, step }) => {
    const data = event.data as ClerkUserData;

    await step.run("insert-user", async () => {
      await db
        .insert(users)
        .values({
          id: data.id,
          email: data.email,
          name: data.name,
          imageUrl: data.imageUrl,
        })
        .onConflictDoNothing({ target: users.id });
    });

    return { userId: data.id };
  },
);

// clerk/user.updated → save the latest details.
// Written as an upsert: the insert covers the rare case where the row is missing
// (e.g. the update somehow arrives before the create); on a conflict it
// overwrites the changed fields and bumps `updated_at`.
export const syncUserUpdated = inngest.createFunction(
  {
    id: "sync-user-updated",
    triggers: [{ event: "clerk/user.updated" }],
  },
  async ({ event, step }) => {
    const data = event.data as ClerkUserData;

    await step.run("upsert-user", async () => {
      await db
        .insert(users)
        .values({
          id: data.id,
          email: data.email,
          name: data.name,
          imageUrl: data.imageUrl,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: data.email,
            name: data.name,
            imageUrl: data.imageUrl,
            updatedAt: new Date(),
          },
        });
    });

    return { userId: data.id };
  },
);

// clerk/user.deleted → remove the row.
// Deleting a row that is already gone is a no-op, so this is safe to retry.
export const syncUserDeleted = inngest.createFunction(
  {
    id: "sync-user-deleted",
    triggers: [{ event: "clerk/user.deleted" }],
  },
  async ({ event, step }) => {
    const data = event.data as ClerkUserDeleted;

    await step.run("delete-user", async () => {
      await db.delete(users).where(eq(users.id, data.id));
    });

    return { userId: data.id };
  },
);

// A short, user-facing reason for a failed generation (never leak internals).
function friendlyError(err: unknown): string {
  if (isRateLimitError(err)) {
    return "Our AI is busy right now (free-tier limit reached). Please wait a minute and try again.";
  }
  return "We couldn't build this itinerary. Please try again.";
}

// trip/requested → generate a full itinerary and persist it.
// Pipeline (each step retried independently by Inngest):
//   generating → Gemini itinerary
//   enriching  → Photon geocode (throttled, cached)
//   imaging    → Pexels cover image
//   finalizing → persist days + activities, mark ready
// The middle statuses drive the loading-screen steps. onFailure marks the trip
// failed after retries and excludes it from the per-user cap.
export const generateTrip = inngest.createFunction(
  {
    id: "generate-trip",
    triggers: [{ event: "trip/requested" }],
    retries: 2,
    onFailure: async ({ event, error, step }) => {
      // The failure event wraps the original event; read the tripId defensively.
      const failed = event as unknown as {
        data?: { tripId?: string; event?: { data?: { tripId?: string } } };
      };
      const tripId = failed.data?.event?.data?.tripId ?? failed.data?.tripId;
      if (!tripId) return;

      await step.run("mark-failed", async () => {
        await db
          .update(trips)
          .set({
            status: "failed",
            errorMessage: friendlyError(error),
            countsAgainstCap: false,
          })
          .where(eq(trips.id, tripId));
      });
    },
  },
  async ({ event, step, group }) => {
    const { tripId } = event.data as { tripId: string };

    // 1. Load params + mark generating. If the trip was deleted, stop quietly.
    const params = await step.run("mark-generating", async () => {
      const [row] = await db
        .update(trips)
        .set({ status: "generating" })
        .where(eq(trips.id, tripId))
        .returning();
      if (!row) return null;
      return {
        destination: row.destination,
        numDays: row.numDays,
        numTravelers: row.numTravelers,
        budgetLevel: row.budgetLevel,
        interests: row.interests,
        pace: row.pace,
      };
    });
    if (!params) return { skipped: "trip-missing" };

    // 2. Gemini itinerary (structured JSON, validated), as an A/B experiment
    // between the cheap and the stronger Flash model. 90% of runs take the
    // cheap arm; the remaining 10% give a quality yardstick to compare it
    // against. Weights are relative, not percentages — 90/10 happens to be
    // both. The selection is memoized by Inngest, so a retry of a later step
    // never re-rolls the model, and the variant name shows on every step in
    // the run in the Inngest dashboard.
    const { result: itinerary, variant: model } = await group.experiment(
      "itinerary-model",
      {
        variants: {
          // Each arm has its own step id: an already-completed run keeps its
          // own arm's cached result, and the dashboard shows which ran.
          flash_lite: () =>
            step.run("generate-itinerary-flash-lite", () =>
              generateItinerary(params, ITINERARY_MODELS.flashLite),
            ),
          flash: () =>
            step.run("generate-itinerary-flash", () =>
              generateItinerary(params, ITINERARY_MODELS.flash),
            ),
        },
        select: experiment.weighted({ flash_lite: 90, flash: 10 }),
      },
    );

    // 3. Enrich places with coordinates, throttled ≥1s and cached.
    await step.run("mark-enriching", async () => {
      await db.update(trips).set({ status: "enriching" }).where(eq(trips.id, tripId));
    });

    const uniquePlaces = [
      ...new Set(
        itinerary.days.flatMap((d) =>
          d.activities.map((a) => a.placeName).filter((p): p is string => !!p),
        ),
      ),
    ];

    const geoByPlace: Record<string, GeoResult> = {};
    for (let i = 0; i < uniquePlaces.length; i++) {
      const place = uniquePlaces[i];
      geoByPlace[place] = await step.run(`geocode-${i}`, () =>
        geocodePlace(place, params.destination),
      );
      if (i < uniquePlaces.length - 1) {
        await step.sleep(`throttle-${i}`, "1s");
      }
    }

    // 4. Cover image.
    await step.run("mark-imaging", async () => {
      await db.update(trips).set({ status: "imaging" }).where(eq(trips.id, tripId));
    });
    const images = await step.run("cover-images", () =>
      getDestinationImages(params.destination),
    );
    const cover = images[0] ?? null;

    // 5. Persist everything and mark ready.
    await step.run("finalize", async () => {
      await db.update(trips).set({ status: "finalizing" }).where(eq(trips.id, tripId));

      // Gemini's structured output isn't guaranteed unique per dayNumber; a
      // duplicate would violate days_trip_day_unique and fail the whole batch.
      // Keep the first occurrence of each dayNumber.
      const seenDayNumbers = new Set<number>();
      const uniqueDays = itinerary.days.filter((d) => {
        if (seenDayNumbers.has(d.dayNumber)) return false;
        seenDayNumbers.add(d.dayNumber);
        return true;
      });

      const dayRows = uniqueDays.map((d) => ({
        id: crypto.randomUUID(),
        tripId,
        dayNumber: d.dayNumber,
        themeTitle: d.themeTitle || null,
      }));

      const activityRows = uniqueDays.flatMap((d, dayIndex) =>
        d.activities.map((a, order) => {
          const geo = a.placeName ? geoByPlace[a.placeName] : null;
          const timeOfDay = (
            TIME_OF_DAY as readonly string[]
          ).includes(a.timeOfDay)
            ? (a.timeOfDay as TimeOfDay)
            : TIME_OF_DAY[Math.min(order, 2)];
          return {
            id: crypto.randomUUID(),
            dayId: dayRows[dayIndex].id,
            timeOfDay,
            name: a.name,
            description: a.description || null,
            estCostUsd: a.estCostUsd != null ? Math.round(a.estCostUsd) : null,
            placeName: a.placeName ?? null,
            lat: geo?.lat ?? null,
            lng: geo?.lng ?? null,
            placeVerified: geo != null,
            sortOrder: order,
          };
        }),
      );

      await db.batch([
        db.insert(days).values(dayRows),
        db.insert(activities).values(activityRows),
        db
          .update(trips)
          .set({
            status: "ready",
            title: itinerary.title,
            summary: itinerary.summary,
            coverImageUrl: cover?.url ?? null,
            coverImagePhotographerName: cover?.photographerName ?? null,
            coverImagePhotographerUrl: cover?.photographerUrl ?? null,
            coverImageUnsplashUrl: cover?.unsplashUrl ?? null,
            images: images.length > 0 ? images : null,
          })
          .where(eq(trips.id, tripId)),
      ]);
    });

    // `model` is the variant name, so a run's arm is visible in the run output
    // as well as on its steps — enough to compare arms without a schema change.
    return { tripId, days: itinerary.days.length, model };
  },
);
