import { GoogleGenAI } from "@google/genai";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { GEMINI_TIMEOUT_MS, isRateLimitError } from "@/server/ai/rate-limit";
import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { chatConversations, chatMessages, trips } from "@/server/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// How many prior turns to load — bounds both the DB read and the tokens sent
// to Gemini. Older history simply falls out of context.
const HISTORY_LIMIT = 30;
const MAX_TITLE_LENGTH = 40;

function normalizeUuid(raw: string | null | undefined): string | null {
  return raw && UUID_RE.test(raw) ? raw : null;
}

// Auto-title a new general-assistant conversation from its first message —
// truncated at a word boundary, like ChatGPT's auto-named chats.
function titleFromMessage(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const capped =
    trimmed.length > MAX_TITLE_LENGTH
      ? trimmed.slice(0, MAX_TITLE_LENGTH).replace(/\s+\S*$/, "") + "…"
      : trimmed;
  return capped.charAt(0).toUpperCase() + capped.slice(1);
}

const postSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  tripId: z.string().nullable().optional(),
  conversationId: z.string().nullable().optional(),
});

const SYSTEM_PROMPT = [
  "You are Triply's friendly, knowledgeable travel assistant.",
  "Help users plan trips: destinations, day-by-day ideas, activities, food, budgets, packing, transport, and local tips.",
  "Keep answers concise, practical, and warm.",
  "Reply in plain text. Do NOT use Markdown formatting — no asterisks, no '#', no bold or italic markers. For lists, use a simple '-' dash and short lines.",
  "Only answer travel-related questions; if asked something off-topic, politely steer back to travel.",
  "Never ask for or store personal identity details (full name, email, passwords, payment info).",
].join(" ");

type TripWithDays = {
  title: string | null;
  destination: string;
  numDays: number;
  numTravelers: number;
  budgetLevel: string;
  summary: string | null;
  days: {
    dayNumber: number;
    themeTitle: string | null;
    activities: {
      timeOfDay: string;
      name: string;
      placeName: string | null;
      estCostUsd: number | null;
    }[];
  }[];
};

// Build a compact, itinerary-only context string. Contains NO personal identity
// data — only the trip the user is looking at.
function buildTripContext(trip: TripWithDays): string {
  const lines: string[] = [
    "The user is currently viewing this specific trip they generated. Ground your answers in it:",
    `Title: ${trip.title ?? trip.destination}`,
    `Destination: ${trip.destination}`,
    `Length: ${trip.numDays} days · ${trip.numTravelers} travelers · ${trip.budgetLevel} budget`,
  ];
  if (trip.summary) lines.push(`Summary: ${trip.summary}`);
  lines.push("Itinerary:");
  for (const day of trip.days) {
    lines.push(
      `Day ${day.dayNumber}${day.themeTitle ? ` — ${day.themeTitle}` : ""}:`,
    );
    for (const a of day.activities) {
      const cost = a.estCostUsd != null ? ` (~$${a.estCostUsd})` : "";
      const place = a.placeName ? ` at ${a.placeName}` : "";
      lines.push(`  - ${a.timeOfDay}: ${a.name}${place}${cost}`);
    }
  }
  lines.push(
    "You can suggest tweaks or alternatives, but you cannot change the saved itinerary yourself.",
  );
  return lines.join("\n");
}

// Selects the thread filter: a trip's single thread, or one general
// conversation. Exactly one of tripId/conversationId is non-null by the time
// this is called.
function threadFilter(
  userId: string,
  tripId: string | null,
  conversationId: string | null,
) {
  if (tripId) {
    return and(
      eq(chatMessages.userId, userId),
      eq(chatMessages.tripId, tripId),
    );
  }
  return and(
    eq(chatMessages.userId, userId),
    conversationId
      ? eq(chatMessages.conversationId, conversationId)
      : isNull(chatMessages.conversationId),
  );
}

// GET /api/chat?tripId=<uuid>            — a trip's single thread
// GET /api/chat?conversationId=<uuid>    — one general-assistant conversation
// GET /api/chat (neither)                — a not-yet-started new chat (empty)
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();

  const url = new URL(request.url);
  const tripId = normalizeUuid(url.searchParams.get("tripId"));
  const conversationId = normalizeUuid(url.searchParams.get("conversationId"));

  if (!tripId && !conversationId) {
    return Response.json({ messages: [] });
  }

  const rows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(threadFilter(userId, tripId, conversationId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);

  return Response.json({ messages: rows });
}

// POST /api/chat — persists the user's message, replies grounded in the
// persisted thread (+ optional trip context), then persists the reply.
// General mode with no conversationId starts a brand-new conversation
// (auto-titled from this message) and returns its id.
export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const tripId = normalizeUuid(parsed.data.tripId);
  let conversationId = normalizeUuid(parsed.data.conversationId);
  const message = parsed.data.message;

  let systemInstruction = SYSTEM_PROMPT;
  if (tripId) {
    const trip = await db.query.trips.findFirst({
      where: and(eq(trips.id, tripId), eq(trips.userId, userId)),
      with: {
        days: {
          orderBy: (d, { asc: ascOrder }) => [ascOrder(d.dayNumber)],
          with: {
            activities: { orderBy: (a, { asc: ascOrder }) => [ascOrder(a.sortOrder)] },
          },
        },
      },
    });
    if (trip) systemInstruction += "\n\n" + buildTripContext(trip);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI is not configured" }, { status: 500 });
  }

  const history = tripId || conversationId
    ? await db
        .select({ role: chatMessages.role, content: chatMessages.content })
        .from(chatMessages)
        .where(threadFilter(userId, tripId, conversationId))
        .orderBy(asc(chatMessages.createdAt))
        .limit(HISTORY_LIMIT)
    : [];

  // General mode with no conversation yet: create one, auto-titled from this
  // first message.
  if (!tripId && !conversationId) {
    const [conversation] = await db
      .insert(chatConversations)
      .values({ userId, title: titleFromMessage(message) })
      .returning({ id: chatConversations.id });
    conversationId = conversation.id;
  }

  // Persist the user's turn up front so it is never lost even if Gemini fails.
  await db
    .insert(chatMessages)
    .values({ userId, tripId, conversationId, role: "user", content: message });

  const contents = [...history, { role: "user" as const, content: message }].map(
    (m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }),
  );

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: GEMINI_TIMEOUT_MS },
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents,
      config: { systemInstruction, temperature: 0.7, maxOutputTokens: 800 },
    });
    const reply = response.text?.trim();
    if (!reply) {
      return Response.json(
        { error: "The assistant didn't reply. Please try again." },
        { status: 502 },
      );
    }

    await db
      .insert(chatMessages)
      .values({ userId, tripId, conversationId, role: "assistant", content: reply });

    if (conversationId && !tripId) {
      await db
        .update(chatConversations)
        .set({ updatedAt: new Date() })
        .where(eq(chatConversations.id, conversationId));
    }

    return Response.json({ reply, conversationId: tripId ? null : conversationId });
  } catch (err) {
    if (isRateLimitError(err)) {
      return Response.json(
        {
          error:
            "Our AI is busy right now (free-tier limit reached). Please wait a minute and try again.",
          code: "RATE_LIMIT",
        },
        { status: 429 },
      );
    }
    console.error("Chat failed:", err);
    return Response.json(
      { error: "The assistant couldn't reply. Please try again." },
      { status: 502 },
    );
  }
}
