import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";

// Makes sure the signed-in Clerk user has a row in `users` before a write that
// depends on it.
//
// The normal path is the Clerk `user.created` webhook → Inngest →
// `syncUserCreated` (src/server/inngest/functions.ts). That is still the source
// of truth. But it is asynchronous, so a fast user can sign up and post a trip
// before the job commits — and `trips.userId` is a NOT NULL foreign key to
// `users.id`, so the insert would die on a foreign-key violation the caller
// cannot act on. The webhook can also be misconfigured or briefly down, which
// turns every new account into a broken one.
//
// So this is a safety net, not a replacement: it fills the row in from Clerk
// when it is missing. The insert uses `onConflictDoNothing`, so it races
// harmlessly against the webhook — whichever arrives first wins and the other
// is a no-op.
// The whole body is inside the try. An earlier version started it only after
// the lookup, which meant an unreachable database threw out of here and became
// the unhandled 500 this function exists to prevent.
export async function ensureUser(userId: string): Promise<boolean> {
  try {
    // Cheap primary-key lookup. On the overwhelmingly common path the row is
    // already there and this is the only cost — no Clerk call.
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (existing.length > 0) return true;

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.error("CLERK_SECRET_KEY is not set");
      return false;
    }

    const clerkUser = await createClerkClient({ secretKey }).users.getUser(
      userId,
    );

    // `email` is NOT NULL in the schema. Prefer the address Clerk marks as
    // primary; fall back to the first one on the account.
    const email =
      clerkUser.emailAddresses.find(
        (address) => address.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      // Nothing to insert that satisfies the schema. Sign-in requires an email
      // in this app, so this means something is wrong with the Clerk account
      // rather than with the request.
      console.error("Clerk user has no email address:", userId);
      return false;
    }

    // Derived exactly as the webhook derives it
    // (src/app/api/webhooks/clerk+api.ts) — no username fallback. Both paths
    // write the same row and which one wins is a race, so a difference here
    // would mean the stored name depended on that race.
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      null;

    await db
      .insert(users)
      .values({ id: userId, email, name, imageUrl: clerkUser.imageUrl || null })
      .onConflictDoNothing({ target: users.id });

    return true;
  } catch (err) {
    console.error("Failed to back-fill user row:", err);
    return false;
  }
}

// 503 for the case above: the account is valid, but we could not get it into
// the database, so the write cannot proceed. Retrying is the right advice —
// the webhook usually lands within seconds.
export function userSyncUnavailable(): Response {
  return Response.json(
    { error: "Your account is still being set up. Please try again." },
    { status: 503 },
  );
}
