import { Type, type Schema } from "@google/genai";
import { z } from "zod";

export const MAX_DAYS = 7;
export const TIME_OF_DAY = ["morning", "afternoon", "evening"] as const;

// Zod schema used to validate Gemini's JSON after parsing (never trust the model
// blindly). Kept lenient — missing optional fields are tolerated and normalized
// by the caller.
export const activitySchema = z.object({
  timeOfDay: z.string(),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  estCostUsd: z.number().nonnegative().nullable().optional(),
  placeName: z.string().nullable().optional(),
});

export const daySchema = z.object({
  dayNumber: z.number().int(),
  themeTitle: z.string().optional().default(""),
  activities: z.array(activitySchema),
});

export const itinerarySchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  days: z.array(daySchema).min(1),
});

export type Itinerary = z.infer<typeof itinerarySchema>;

// Gemini structured-output schema (OpenAPI subset). Forcing this shape makes the
// model return parseable JSON; Zod above is the second line of defense.
export const geminiResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dayNumber: { type: Type.INTEGER },
          themeTitle: { type: Type.STRING },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeOfDay: {
                  type: Type.STRING,
                  format: "enum",
                  enum: [...TIME_OF_DAY],
                },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                estCostUsd: { type: Type.NUMBER },
                placeName: { type: Type.STRING },
              },
              propertyOrdering: [
                "timeOfDay",
                "name",
                "description",
                "estCostUsd",
                "placeName",
              ],
              required: ["timeOfDay", "name", "description", "placeName"],
            },
          },
        },
        propertyOrdering: ["dayNumber", "themeTitle", "activities"],
        required: ["dayNumber", "themeTitle", "activities"],
      },
    },
  },
  propertyOrdering: ["title", "summary", "days"],
  required: ["title", "summary", "days"],
};
