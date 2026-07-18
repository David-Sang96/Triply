import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Mirror of a Clerk user. Populated by the Clerk `user.created` webhook via an
// Inngest job (see src/server/inngest/functions.ts). `id` is the Clerk user id
// (text), used directly as the primary key so we never store a second id.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
