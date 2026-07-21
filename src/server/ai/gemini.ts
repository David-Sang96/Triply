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
};

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
  ].join("\n");
}

// Calls Gemini with structured JSON output, then parses + validates. Throws on
// empty output or invalid JSON so Inngest retries the step.
export async function generateItinerary(p: TripParams): Promise<Itinerary> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: GEMINI_TIMEOUT_MS },
  });
  const days = Math.min(Math.max(p.numDays, 1), MAX_DAYS);

  const response = await ai.models.generateContent({
    // Alias for the current Flash model. Avoids hard-pinning a version that
    // Google later retires for new accounts (which 404'd gemini-2.5-flash).
    model: "gemini-flash-latest",
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
