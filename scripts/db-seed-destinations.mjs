import "dotenv/config";

import { neon } from "@neondatabase/serverless";

// Seeds the `destinations` table with curated Home-screen content (hero
// rotation + "Popular destinations"). Safe to re-run — upserts by slug, so
// re-running after editing this list just updates existing rows instead of
// duplicating them.
//
// Only 6 of the 16 have heroTitle/heroSubtitle set (hero-eligible); all 16
// show in Popular destinations regardless.
//
// Image note: tokyo/kyoto/santorini/bali/paris reuse the same curated
// Unsplash photos the app already shipped with (confirmed working). The
// other 11 don't have a curated photo yet, so they use a deterministic
// Picsum placeholder (picsum.photos/seed/<slug>) — a real photo, but not
// necessarily of that place. Swap `imageUrl` for a real curated photo per
// destination whenever convenient (e.g. via `npm run db:studio`); nothing
// else needs to change.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env)");
}

const unsplash = (id, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
const placeholder = (slug) => `https://picsum.photos/seed/${slug}/1200/800`;

const DESTINATIONS = [
  {
    slug: "tokyo",
    name: "Tokyo",
    country: "Japan",
    rating: "4.8",
    imageUrl: unsplash("1503899036084-c55cdd92da26"),
    heroTitle: "Neon nights and\nancient temples?",
    heroSubtitle: "Let AI map your Tokyo adventure.",
  },
  {
    slug: "kyoto",
    name: "Kyoto",
    country: "Japan",
    rating: "4.7",
    imageUrl: unsplash("1545569341-9eb8b30979d9"),
    heroTitle: null,
    heroSubtitle: null,
  },
  {
    slug: "santorini",
    name: "Santorini",
    country: "Greece",
    rating: "4.8",
    imageUrl: unsplash("1570077188670-e3a8d69ac5ff"),
    heroTitle: "Chasing Greek\nisland sunsets?",
    heroSubtitle: "Let AI plan your Santorini escape.",
  },
  {
    slug: "bali",
    name: "Bali",
    country: "Indonesia",
    rating: "4.6",
    imageUrl: unsplash("1537996194471-e657df975ab4"),
    heroTitle: "Temples and\nBali beaches?",
    heroSubtitle: "Your island itinerary, made in seconds.",
  },
  {
    slug: "paris",
    name: "Paris",
    country: "France",
    rating: "4.8",
    imageUrl: unsplash("1502602898657-3e91760cbb34"),
    heroTitle: "Ready to fall\nfor Paris?",
    heroSubtitle: "Cafés, museums and hidden gems, planned.",
  },
  {
    slug: "rome",
    name: "Rome",
    country: "Italy",
    rating: "4.7",
    imageUrl: placeholder("rome"),
    heroTitle: null,
    heroSubtitle: null,
  },
  {
    slug: "reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    rating: "4.6",
    imageUrl: placeholder("reykjavik"),
    heroTitle: null,
    heroSubtitle: null,
  },
  {
    slug: "new-york",
    name: "New York",
    country: "USA",
    rating: "4.7",
    imageUrl: placeholder("new-york"),
    heroTitle: null,
    heroSubtitle: null,
  },
  {
    slug: "dubai",
    name: "Dubai",
    country: "UAE",
    rating: "4.5",
    imageUrl: placeholder("dubai"),
    heroTitle: "Skyscrapers and\ndesert dunes?",
    heroSubtitle: "Plan a Dubai adventure in minutes.",
  },
  {
    slug: "barcelona",
    name: "Barcelona",
    country: "Spain",
    rating: "4.6",
    imageUrl: placeholder("barcelona"),
    heroTitle: null,
    heroSubtitle: null,
  },
  {
    slug: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    rating: "4.5",
    imageUrl: placeholder("bangkok"),
    heroTitle: null,
    heroSubtitle: null,
  },
  {
    slug: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    rating: "4.6",
    imageUrl: placeholder("cape-town"),
    heroTitle: null,
    heroSubtitle: null,
  },
  {
    slug: "sydney",
    name: "Sydney",
    country: "Australia",
    rating: "4.7",
    imageUrl: placeholder("sydney"),
    heroTitle: null,
    heroSubtitle: null,
  },
  {
    slug: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    rating: "4.5",
    imageUrl: placeholder("marrakech"),
    heroTitle: "Souks, spice and\nSaharan nights?",
    heroSubtitle: "Let AI plan your Marrakech escape.",
  },
  {
    slug: "machu-picchu",
    name: "Machu Picchu",
    country: "Peru",
    rating: "4.8",
    imageUrl: placeholder("machu-picchu"),
    heroTitle: null,
    heroSubtitle: null,
  },
  {
    slug: "maldives",
    name: "Maldives",
    country: "Maldives",
    rating: "4.9",
    imageUrl: placeholder("maldives"),
    heroTitle: null,
    heroSubtitle: null,
  },
];

const sql = neon(process.env.DATABASE_URL);

let count = 0;
for (const [index, d] of DESTINATIONS.entries()) {
  await sql`
    INSERT INTO destinations
      (slug, name, country, rating, image_url, hero_title, hero_subtitle, sort_order)
    VALUES
      (${d.slug}, ${d.name}, ${d.country}, ${d.rating}, ${d.imageUrl}, ${d.heroTitle}, ${d.heroSubtitle}, ${index})
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      country = EXCLUDED.country,
      rating = EXCLUDED.rating,
      image_url = EXCLUDED.image_url,
      hero_title = EXCLUDED.hero_title,
      hero_subtitle = EXCLUDED.hero_subtitle,
      sort_order = EXCLUDED.sort_order
  `;
  count++;
}

console.log(`✅ Seeded/updated ${count} destinations.`);
