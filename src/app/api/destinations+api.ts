import { asc } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { destinations } from "@/server/db/schema";

// GET /destinations — curated Home-screen content (hero rotation + Popular
// destinations). Same rows for every user; auth is required because every
// route in this app is signed-in-only, not because the query is user-scoped.
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();

  const rows = await db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name,
      country: destinations.country,
      rating: destinations.rating,
      imageUrl: destinations.imageUrl,
      photographerName: destinations.photographerName,
      photographerUrl: destinations.photographerUrl,
      unsplashUrl: destinations.unsplashUrl,
      heroTitle: destinations.heroTitle,
      heroSubtitle: destinations.heroSubtitle,
      description: destinations.description,
    })
    .from(destinations)
    .orderBy(asc(destinations.sortOrder));

  return Response.json({ destinations: rows });
}
