import { GoogleGenAI } from "@google/genai";

import {
  geminiResponseSchema,
  itinerarySchema,
  MAX_DAYS,
  type Itinerary,
} from "./itinerary-schema";
import { GEMINI_TIMEOUT_MS } from "./rate-limit";

// Only trip parameters — never the user's name/email/id. The Gemini free tier
// may train on prompts, so no personal data crosses this boundary.
export type TripParams = {
  destination: string;
  numDays: number;
  numTravelers: number;
  budgetLevel: string;
  interests: string[];
  pace: string | null;
  /** Language for the generated prose. "en" when the caller does not say. */
  language?: string;
};

// Burmese output, when asked for. The place-name carve-out is not cosmetic:
// the server geocodes "placeName" with Photon to put a pin on the map, and
// Burmese-script names mostly fail to geocode — a translated name would cost
// the trip its map pins and flip place_verified false. The user also needs a
// name they can show a driver or match to a sign.
function languageRules(language: string | undefined): string[] {
  if (language !== "my") return [];
  return [
    `- Write "title", "summary", every day "title", and every activity "name" and "description" in Burmese (Myanmar script, Unicode — never Zawgyi).`,
    `- LEAVE "placeName" EXACTLY as the real place is written for a map search, in its usual Latin/English form (e.g. "Shwezigon Pagoda"). Do NOT translate or transliterate it.`,
  ];
}

function buildPrompt(p: TripParams): string {
  const days = Math.min(Math.max(p.numDays, 1), MAX_DAYS);
  const interests = p.interests.length ? p.interests.join(", ") : "general sightseeing";
  const pace = p.pace ?? "balanced";

  return [
    `You are an expert local travel planner. Plan a realistic ${days}-day trip to ${p.destination}.`,
    ``,
    `Travelers: ${p.numTravelers}. Budget level: ${p.budgetLevel}. Interests: ${interests}. Travel pace: ${pace}.`,
    ``,
    `Rules:`,
    `- Produce exactly ${days} day(s), numbered 1 to ${days}.`,
    `- Each day has a short theme title and exactly three activities: one "morning", one "afternoon", one "evening".`,
    `- Each activity must reference a REAL, well-known, currently-open place that can be found on a map. Put the exact searchable place name in "placeName" (e.g. "Senso-ji Temple", not "a nice temple").`,
    `- "name" is a short action title; "description" is 1-2 helpful sentences.`,
    `- "estCostUsd" is the approximate total cost in US dollars for the whole group of ${p.numTravelers}, as a number (0 for free activities).`,
    `- Match the ${p.budgetLevel} budget and a ${pace} pace. Keep each day geographically sensible (avoid criss-crossing the city).`,
    `- "title" is a short catchy trip title. "summary" is 2-3 sentences describing the trip overall.`,
    `- Do not invent places. If unsure, choose a famous landmark in ${p.destination}.`,
    ...languageRules(p.language),
  ].join("\n");
}

// The two models the itinerary experiment picks between (see generateTrip in
// src/server/inngest/functions.ts). Pinned to exact versions on purpose: the
// `gemini-flash-latest` alias moves to a new model when Google ships one, which
// would silently change an arm mid-experiment and make the comparison
// meaningless. Both ids were confirmed available on this project's API key —
// re-check with a models.list call before changing them.
export const ITINERARY_MODELS = {
  /** Cheapest, for the bulk of traffic. */
  flashLite: "gemini-3.5-flash-lite",
  /** Stronger and dearer, for the comparison slice. */
  flash: "gemini-3.6-flash",
} as const;

export type ItineraryModel =
  (typeof ITINERARY_MODELS)[keyof typeof ITINERARY_MODELS];

// Calls Gemini with structured JSON output, then parses + validates. Throws on
// empty output or invalid JSON so Inngest retries the step.
export async function generateItinerary(
  p: TripParams,
  // Defaults to the floating alias, which is right for callers outside the
  // experiment: they want "the current Flash model", not a pinned version.
  model: ItineraryModel | "gemini-flash-latest" = "gemini-flash-latest",
): Promise<Itinerary> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: GEMINI_TIMEOUT_MS },
  });
  const days = Math.min(Math.max(p.numDays, 1), MAX_DAYS);

  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(p),
    config: {
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema,
      temperature: 0.9,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned no content");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  const itinerary = itinerarySchema.parse(raw);

  // Clamp to the requested number of days in case the model over-produced.
  itinerary.days = itinerary.days
    .filter((d) => d.dayNumber >= 1 && d.dayNumber <= days)
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .slice(0, days);

  if (itinerary.days.length === 0) {
    throw new Error("Gemini returned no usable days");
  }

  return itinerary;
}
