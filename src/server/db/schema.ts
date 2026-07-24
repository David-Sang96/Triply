import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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

// Trip generation lifecycle. Polling reads only `status` (single source of
// truth). The middle states map 1:1 onto the loading-screen steps:
//   generating → "Generating itinerary with AI"
//   enriching  → "Verifying places & locations"
//   imaging    → "Finding the best images"
//   finalizing → "Finalizing your trip"
export const tripStatus = pgEnum("trip_status", [
  "queued",
  "generating",
  "enriching",
  "imaging",
  "finalizing",
  "ready",
  "failed",
]);

export const budgetLevel = pgEnum("budget_level", [
  "Budget",
  "Mid-range",
  "Luxury",
]);

export const timeOfDay = pgEnum("time_of_day", [
  "morning",
  "afternoon",
  "evening",
]);

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    destination: text("destination").notNull(),
    numDays: integer("num_days").notNull(),
    numTravelers: integer("num_travelers").notNull(),
    budgetLevel: budgetLevel("budget_level").notNull(),
    interests: text("interests").array().notNull(),
    pace: text("pace"),
    title: text("title"),
    summary: text("summary"),
    coverImageUrl: text("cover_image_url"),
    // Unsplash requires crediting the photographer and linking back to Unsplash
    // wherever a photo is shown (see src/server/images.ts).
    coverImagePhotographerName: text("cover_image_photographer_name"),
    coverImagePhotographerUrl: text("cover_image_photographer_url"),
    coverImageUnsplashUrl: text("cover_image_unsplash_url"),
    // A user-uploaded photo (via ImageKit) that can replace the Unsplash cover
    // above. useCustomCover picks which one is shown; the Unsplash fields
    // above are kept untouched so the user can switch back to them.
    customCoverImageUrl: text("custom_cover_image_url"),
    // ImageKit's fileId for the row above — needed to delete the file from
    // ImageKit when it's replaced by a new upload or the trip is deleted.
    customCoverImageFileId: text("custom_cover_image_file_id"),
    useCustomCover: boolean("use_custom_cover").notNull().default(false),
    // Gallery of destination photos for the detail carousel (first is the cover).
    images: jsonb("images").$type<
      {
        url: string;
        photographerName: string;
        photographerUrl: string;
        unsplashUrl: string;
      }[]
    >(),
    status: tripStatus("status").notNull().default("queued"),
    errorMessage: text("error_message"),
    // Failed generations do not count toward the per-user cap.
    countsAgainstCap: boolean("counts_against_cap").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("trips_user_id_idx").on(t.userId)],
);

export const days = pgTable(
  "days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    dayNumber: integer("day_number").notNull(),
    themeTitle: text("theme_title"),
  },
  (t) => [unique("days_trip_day_unique").on(t.tripId, t.dayNumber)],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dayId: uuid("day_id")
      .notNull()
      .references(() => days.id, { onDelete: "cascade" }),
    timeOfDay: timeOfDay("time_of_day").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    estCostUsd: integer("est_cost_usd"),
    placeName: text("place_name"),
    lat: real("lat"),
    lng: real("lng"),
    // Set true only when the geocoder returned coordinates for the place.
    placeVerified: boolean("place_verified").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("activities_day_id_idx").on(t.dayId)],
);

export const chatRole = pgEnum("chat_role", ["user", "assistant"]);

// A general-assistant conversation (like a ChatGPT/WhatsApp thread in an inbox
// list). `title` is auto-derived from the first message. Trip-scoped chat does
// NOT use this table — it stays one single thread per trip (see chatMessages).
export const chatConversations = pgTable(
  "chat_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("chat_conversations_user_id_idx").on(t.userId, t.updatedAt)],
);

// One row per chat turn. Exactly one of `tripId` / `conversationId` is set:
//   tripId set          → the single ongoing thread scoped to that trip
//                          ("Ask AI about this trip").
//   conversationId set  → one message in a general-assistant conversation
//                          (a user can have many; see chatConversations).
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").references(() => trips.id, {
      onDelete: "cascade",
    }),
    conversationId: uuid("conversation_id").references(
      () => chatConversations.id,
      { onDelete: "cascade" },
    ),
    role: chatRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("chat_messages_thread_idx").on(t.userId, t.tripId, t.createdAt),
    index("chat_messages_conversation_idx").on(t.conversationId, t.createdAt),
    check(
      "chat_messages_exactly_one_thread",
      sql`(${t.tripId} is not null) <> (${t.conversationId} is not null)`,
    ),
  ],
);

// Caches geocoding results (Photon) to avoid repeat lookups and stay light on
// the free service. `query` is the normalized search string.
export const placeCache = pgTable("place_cache", {
  query: text("query").primaryKey(),
  lat: real("lat"),
  lng: real("lng"),
  displayName: text("display_name"),
  raw: jsonb("raw"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Curated Home-screen content (hero rotation + "Popular destinations"). Not
// user-specific — every signed-in user sees the same rows. heroTitle/
// heroSubtitle are only set on the destinations featured in the hero
// carousel; every row shows in Popular destinations regardless.
export const destinations = pgTable("destinations", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  rating: text("rating").notNull(),
  imageUrl: text("image_url").notNull(),
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Destination = typeof destinations.$inferSelect;
export type NewDestination = typeof destinations.$inferInsert;

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, { fields: [trips.userId], references: [users.id] }),
  days: many(days),
}));

export const daysRelations = relations(days, ({ one, many }) => ({
  trip: one(trips, { fields: [days.tripId], references: [trips.id] }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  day: one(days, { fields: [activities.dayId], references: [days.id] }),
}));

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type Day = typeof days.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type TripStatus = (typeof tripStatus.enumValues)[number];
export type BudgetLevel = (typeof budgetLevel.enumValues)[number];
export type TimeOfDay = (typeof timeOfDay.enumValues)[number];
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type ChatRole = (typeof chatRole.enumValues)[number];
export type ChatConversation = typeof chatConversations.$inferSelect;
