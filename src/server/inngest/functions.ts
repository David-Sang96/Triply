import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { users } from "@/server/db/schema";

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
