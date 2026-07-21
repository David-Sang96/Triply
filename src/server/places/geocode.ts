import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { placeCache } from "@/server/db/schema";

export type GeoResult = { lat: number; lng: number; displayName: string } | null;

function normalize(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function displayNameFrom(
  props: Record<string, unknown> | undefined,
  fallback: string,
): string {
  if (!props) return fallback;
  const parts = [props.name, props.city, props.state, props.country].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return parts.length > 0 ? parts.join(", ") : fallback;
}

// Geocode a place name to coordinates via Photon (photon.komoot.io) — an
// OSM-based geocoder that is free, needs no API key or card, and (unlike the
// public Nominatim server, which blocks systematic per-trip lookups) permits
// this usage. Results are cached in `place_cache` so a place is never looked up
// twice. A place that cannot be geocoded returns null and is left unverified —
// never a hard failure.
export async function geocodePlace(
  placeName: string,
  contextCity: string,
): Promise<GeoResult> {
  const query = `${placeName}, ${contextCity}`;
  const key = normalize(query);

  const cached = await db
    .select()
    .from(placeCache)
    .where(eq(placeCache.query, key))
    .limit(1);

  if (cached.length > 0) {
    const c = cached[0];
    return c.lat != null && c.lng != null
      ? { lat: c.lat, lng: c.lng, displayName: c.displayName ?? placeName }
      : null;
  }

  const url = new URL("https://photon.komoot.io/api");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");

  // Photon needs no User-Agent, but we send a contact string when configured, as
  // a courtesy to the free shared service.
  const headers: Record<string, string> = { Accept: "application/json" };
  const ua = process.env.NOMINATIM_USER_AGENT;
  if (ua) headers["User-Agent"] = ua;

  let result: GeoResult = null;
  let raw: unknown = null;

  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = (await res.json()) as {
        features?: {
          geometry?: { coordinates?: [number, number] };
          properties?: Record<string, unknown>;
        }[];
      };
      raw = data;
      // Photon returns GeoJSON: coordinates are [lng, lat].
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length === 2) {
        result = {
          lat: coords[1],
          lng: coords[0],
          displayName: displayNameFrom(data.features?.[0]?.properties, placeName),
        };
      }
    }
  } catch (err) {
    console.error("Photon geocode failed:", err);
    return null; // do not cache network failures
  }

  await db
    .insert(placeCache)
    .values({
      query: key,
      lat: result?.lat ?? null,
      lng: result?.lng ?? null,
      displayName: result?.displayName ?? null,
      raw,
    })
    .onConflictDoNothing({ target: placeCache.query });

  return result;
}
