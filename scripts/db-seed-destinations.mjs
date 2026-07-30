import "dotenv/config";

import { neon } from "@neondatabase/serverless";

// Seeds the `destinations` table with curated content (hero rotation +
// "Popular destinations" + the destination detail screen). Safe to re-run —
// upserts by slug, so re-running after editing this list updates existing rows
// instead of duplicating them.
//
// Photos: each row gets a real Unsplash photo of that place, fetched here and
// stored with its photographer credit (Unsplash's API terms require the credit
// wherever the photo is shown — DestinationDetailView renders it). Rows that
// already have a real photo + credit in the database are left alone, so a
// re-run costs no API calls for them; pass `--refresh` to re-fetch everything.
//
// Rate limit: an Unsplash *demo* key allows 50 requests/hour, and a first full
// run needs about one request per destination. If the key runs out, the
// remaining rows fall back to a deterministic picsum.photos placeholder (a real
// photo, but not of that place) and the script says which slugs to fill in —
// just run it again in an hour to finish them.
//
// Only the rows with heroTitle/heroSubtitle set are hero-carousel eligible;
// every row shows in Popular destinations. The Home rail shows the first 10 by
// sortOrder, so the order of this list matters — see HOME_DESTINATION_COUNT in
// src/app/(tabs)/index.tsx.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (check your .env)");
}

const REFRESH = process.argv.includes("--refresh");
const APP_NAME = "Triply";
const accessKey = process.env.UNSPLASH_ACCESS_KEY;

const placeholder = (slug) => `https://picsum.photos/seed/${slug}/1200/800`;
const isPlaceholder = (url) => !url || url.includes("picsum.photos");

// `photoId` pins the photo for the destinations that shipped with a
// hand-picked one; everything else is searched by name.
const DESTINATIONS = [
  {
    slug: "tokyo",
    name: "Tokyo",
    country: "Japan",
    rating: "4.8",
    photoId: "1503899036084-c55cdd92da26",
    heroTitle: "Neon nights and\nancient temples?",
    heroSubtitle: "Let AI map your Tokyo adventure.",
    description:
      "A city where centuries-old temples sit minutes from neon-lit crossings — endless food, shopping, and culture in every direction.",
  },
  {
    slug: "kyoto",
    name: "Kyoto",
    country: "Japan",
    rating: "4.7",
    photoId: "1545569341-9eb8b30979d9",
    description:
      "Japan's former capital, known for thousands of temples and shrines, quiet bamboo groves, and traditional wooden streets.",
  },
  {
    slug: "santorini",
    name: "Santorini",
    country: "Greece",
    rating: "4.8",
    photoId: "1570077188670-e3a8d69ac5ff",
    heroTitle: "Chasing Greek\nisland sunsets?",
    heroSubtitle: "Let AI plan your Santorini escape.",
    description:
      "Whitewashed villages perched on volcanic cliffs above the Aegean Sea, famous for some of the best sunsets in the world.",
  },
  {
    slug: "bali",
    name: "Bali",
    country: "Indonesia",
    rating: "4.6",
    photoId: "1537996194471-e657df975ab4",
    heroTitle: "Temples and\nBali beaches?",
    heroSubtitle: "Your island itinerary, made in seconds.",
    description:
      "Lush rice terraces, ancient temples, and beaches for every mood — from surf towns to quiet coves.",
  },
  {
    slug: "paris",
    name: "Paris",
    country: "France",
    rating: "4.8",
    photoId: "1502602898657-3e91760cbb34",
    heroTitle: "Ready to fall\nfor Paris?",
    heroSubtitle: "Cafés, museums and hidden gems, planned.",
    description:
      "World-class museums, café culture, and iconic landmarks like the Eiffel Tower and the Louvre, all walkable from each other.",
  },
  {
    slug: "rome",
    name: "Rome",
    country: "Italy",
    rating: "4.7",
    description:
      "Ancient ruins, world-famous pasta, and centuries of history layered into one walkable city.",
  },
  {
    slug: "reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    rating: "4.6",
    description:
      "Gateway to glaciers, geothermal hot springs, and the northern lights — a small city with dramatic nature just outside it.",
  },
  {
    slug: "new-york",
    name: "New York",
    country: "USA",
    rating: "4.7",
    description:
      "The city that never sleeps — Broadway shows, world cuisine, and iconic skylines in every borough.",
  },
  {
    slug: "dubai",
    name: "Dubai",
    country: "UAE",
    rating: "4.5",
    heroTitle: "Skyscrapers and\ndesert dunes?",
    heroSubtitle: "Plan a Dubai adventure in minutes.",
    description:
      "Record-breaking skyscrapers, desert safaris, and luxury shopping, all within reach of each other.",
  },
  {
    slug: "barcelona",
    name: "Barcelona",
    country: "Spain",
    rating: "4.6",
    description:
      "Gaudí's architecture, Mediterranean beaches, and tapas bars packed into one vibrant coastal city.",
  },
  {
    slug: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    rating: "4.5",
    description:
      "Ornate temples, floating markets, and some of the best street food anywhere, day or night.",
  },
  {
    slug: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    rating: "4.6",
    description:
      "Table Mountain, wine country, and coastline collide in one of the most scenic cities in the world.",
  },
  {
    slug: "sydney",
    name: "Sydney",
    country: "Australia",
    rating: "4.7",
    description:
      "Harbourside icons, beach culture, and laid-back city life on Australia's east coast.",
  },
  {
    slug: "marrakech",
    name: "Marrakech",
    country: "Morocco",
    rating: "4.5",
    heroTitle: "Souks, spice and\nSaharan nights?",
    heroSubtitle: "Let AI plan your Marrakech escape.",
    description:
      "Maze-like souks, spice markets, and desert nights just beyond the city — a feast for the senses.",
  },
  {
    slug: "machu-picchu",
    name: "Machu Picchu",
    country: "Peru",
    rating: "4.8",
    description:
      "The legendary Inca citadel high in the Andes — one of the world's most breathtaking archaeological sites.",
  },
  {
    slug: "maldives",
    name: "Maldives",
    country: "Maldives",
    rating: "4.9",
    description:
      "Overwater bungalows and turquoise lagoons across a chain of coral islands — the classic tropical escape.",
  },
  {
    slug: "london",
    name: "London",
    country: "United Kingdom",
    rating: "4.7",
    description:
      "Royal landmarks, free world-class museums, and a different mood in every neighbourhood, all on one Tube map.",
  },
  {
    slug: "edinburgh",
    name: "Edinburgh",
    country: "United Kingdom",
    rating: "4.7",
    description:
      "A castle on a volcanic crag, medieval closes, and hill walks that start in the middle of the city.",
  },
  {
    slug: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    rating: "4.6",
    description:
      "Canal rings, gabled houses, and Van Gogh and Rembrandt within a short bike ride of each other.",
  },
  {
    slug: "copenhagen",
    name: "Copenhagen",
    country: "Denmark",
    rating: "4.5",
    description:
      "Harbour swimming, design shops, and a food scene that runs from hot dog stands to New Nordic tasting menus.",
  },
  {
    slug: "prague",
    name: "Prague",
    country: "Czechia",
    rating: "4.7",
    description:
      "A storybook old town of bridges, spires and courtyards, best seen early before the crowds arrive.",
  },
  {
    slug: "vienna",
    name: "Vienna",
    country: "Austria",
    rating: "4.6",
    description:
      "Imperial palaces, concert halls, and coffee houses where lingering over one cup is the whole point.",
  },
  {
    slug: "budapest",
    name: "Budapest",
    country: "Hungary",
    rating: "4.6",
    description:
      "Thermal baths, Danube views, and ruin bars tucked into courtyards on the Pest side.",
  },
  {
    slug: "venice",
    name: "Venice",
    country: "Italy",
    rating: "4.6",
    description:
      "A city built on water where every wrong turn down an alley leads somewhere worth photographing.",
  },
  {
    slug: "florence",
    name: "Florence",
    country: "Italy",
    rating: "4.7",
    description:
      "Renaissance art at close range, Tuscan food, and a dome you can climb for the best view in the city.",
  },
  {
    slug: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    rating: "4.7",
    description:
      "Tiled façades, steep tram lines, and seafood grills, with Atlantic beaches half an hour away.",
  },
  {
    slug: "dubrovnik",
    name: "Dubrovnik",
    country: "Croatia",
    rating: "4.6",
    description:
      "Walk the walls of a stone city above the Adriatic, then swim straight off the rocks below them.",
  },
  {
    slug: "interlaken",
    name: "Interlaken",
    country: "Switzerland",
    rating: "4.8",
    description:
      "Two lakes, cogwheel trains into the high Alps, and paragliders over the valley all afternoon.",
  },
  {
    slug: "istanbul",
    name: "Istanbul",
    country: "Türkiye",
    rating: "4.7",
    description:
      "Mosques, bazaars and ferry rides between two continents, with meze and tea at every stop.",
  },
  {
    slug: "cappadocia",
    name: "Cappadocia",
    country: "Türkiye",
    rating: "4.8",
    description:
      "Balloons at sunrise over a valley of rock cones, cave hotels, and underground cities carved into tufa.",
  },
  {
    slug: "petra",
    name: "Petra",
    country: "Jordan",
    rating: "4.8",
    description:
      "A rose-red city carved into a canyon wall, reached through a narrow gorge on foot.",
  },
  {
    slug: "cairo",
    name: "Cairo",
    country: "Egypt",
    rating: "4.6",
    description:
      "The pyramids of Giza on the city's edge, plus a museum holding the treasures found inside them.",
  },
  {
    slug: "serengeti",
    name: "Serengeti",
    country: "Tanzania",
    rating: "4.8",
    description:
      "Open savannah, big cats, and the great migration of wildebeest and zebra across the plains.",
  },
  {
    slug: "zanzibar",
    name: "Zanzibar",
    country: "Tanzania",
    rating: "4.6",
    description:
      "Spice farms and Stone Town's carved doors, with sandbanks and dhow sails offshore.",
  },
  {
    slug: "seoul",
    name: "Seoul",
    country: "South Korea",
    rating: "4.7",
    description:
      "Palaces beside glass towers, mountain trails inside the city, and food markets that stay open late.",
  },
  {
    slug: "singapore",
    name: "Singapore",
    country: "Singapore",
    rating: "4.7",
    description:
      "Hawker centres, rooftop gardens, and a skyline you can cross end to end on a single metro line.",
  },
  {
    slug: "hong-kong",
    name: "Hong Kong",
    country: "Hong Kong",
    rating: "4.6",
    description:
      "Harbour views from the Peak, dim sum by the trolley, and hiking trails a short ferry ride away.",
  },
  {
    slug: "hanoi",
    name: "Hanoi",
    country: "Vietnam",
    rating: "4.6",
    description:
      "Old Quarter lanes, lakeside mornings, and bowls of phở served from six in the morning.",
  },
  {
    slug: "ha-long-bay",
    name: "Ha Long Bay",
    country: "Vietnam",
    rating: "4.7",
    description:
      "Thousands of limestone islands rising from green water, best seen from an overnight boat.",
  },
  {
    slug: "siem-reap",
    name: "Siem Reap",
    country: "Cambodia",
    rating: "4.7",
    description:
      "Base for Angkor Wat and the jungle temples around it — sunrise at the causeway is the classic start.",
  },
  {
    slug: "chiang-mai",
    name: "Chiang Mai",
    country: "Thailand",
    rating: "4.6",
    description:
      "Old-city temples, cooking classes, and cool mountain air within reach of the northern hills.",
  },
  {
    slug: "bagan",
    name: "Bagan",
    country: "Myanmar",
    rating: "4.7",
    description:
      "Thousands of brick temples spread across a dry plain, best at first light from a quiet terrace.",
  },
  {
    slug: "agra",
    name: "Agra",
    country: "India",
    rating: "4.7",
    description:
      "Home of the Taj Mahal, plus a red sandstone fort and marble workshops that still cut inlay by hand.",
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    country: "India",
    rating: "4.6",
    description:
      "The pink city of hilltop forts, stepwells, and bazaars selling block prints and bangles.",
  },
  {
    slug: "kerala",
    name: "Kerala",
    country: "India",
    rating: "4.6",
    description:
      "Backwater houseboats, tea hills, and coconut-heavy cooking along India's green southwest coast.",
  },
  {
    slug: "kathmandu",
    name: "Kathmandu",
    country: "Nepal",
    rating: "4.5",
    description:
      "Temple squares and stupas in a valley city that is also the start of most Himalayan treks.",
  },
  {
    slug: "queenstown",
    name: "Queenstown",
    country: "New Zealand",
    rating: "4.8",
    description:
      "Lake and mountain scenery with bungy jumps, jet boats and vineyards all within half an hour.",
  },
  {
    slug: "banff",
    name: "Banff",
    country: "Canada",
    rating: "4.8",
    description:
      "Turquoise lakes under the Rockies, hot springs in town, and wildlife along the park roads.",
  },
  {
    slug: "rio-de-janeiro",
    name: "Rio de Janeiro",
    country: "Brazil",
    rating: "4.6",
    description:
      "Beaches between granite peaks, a mountaintop Christ statue, and samba that spills into the streets.",
  },
  {
    slug: "mexico-city",
    name: "Mexico City",
    country: "Mexico",
    rating: "4.6",
    description:
      "Aztec ruins beside colonial squares, murals, museums, and some of the best street food in the world.",
  },
  {
    slug: "bora-bora",
    name: "Bora Bora",
    country: "French Polynesia",
    rating: "4.8",
    description:
      "A volcanic peak ringed by a lagoon of impossible blues, with overwater bungalows on the reef.",
  },
];

function withUtm(url) {
  const u = new URL(url);
  u.searchParams.set("utm_source", APP_NAME);
  u.searchParams.set("utm_medium", "referral");
  return u.toString();
}

// True once Unsplash has refused a request for rate-limit reasons — no point
// spending the remaining calls, so the rest of the run uses placeholders.
let rateLimited = false;

async function unsplashJson(path) {
  const res = await fetch(`https://api.unsplash.com${path}`, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });
  // Unsplash answers 403 when the hourly quota is gone.
  if (res.status === 403) {
    rateLimited = true;
    return null;
  }
  if (!res.ok) return null;
  return res.json();
}

function toPhoto(raw) {
  const url = raw?.urls?.regular ?? raw?.urls?.full;
  if (!url) return null;
  return {
    imageUrl: url,
    photographerName: raw.user?.name ?? "Unsplash",
    photographerUrl: withUtm(raw.user?.links?.html ?? "https://unsplash.com"),
    unsplashUrl: withUtm(raw.links?.html ?? "https://unsplash.com"),
  };
}

// A real photo of the place, with the credit needed to display it. Returns
// null when there is no key, the quota is gone, or the search finds nothing.
async function fetchPhoto(d) {
  if (!accessKey || rateLimited) return null;

  if (d.photoId) {
    // Hand-picked photo: look it up by id so it keeps its credit.
    const raw = await unsplashJson(`/photos/${encodeURIComponent(d.photoId)}`);
    const photo = raw && toPhoto(raw);
    if (photo) return photo;
    if (rateLimited) return null;
    // Fall through to a search if the pinned photo is gone.
  }

  const params = new URLSearchParams({
    query: `${d.name} ${d.country} travel`,
    orientation: "landscape",
    per_page: "1",
  });
  const data = await unsplashJson(`/search/photos?${params}`);
  return data?.results?.[0] ? toPhoto(data.results[0]) : null;
}

const sql = neon(process.env.DATABASE_URL);

// What is already stored, so rows that have a real photo + credit cost no API
// calls on a re-run.
const existingRows = await sql`
  SELECT slug, image_url, photographer_name, photographer_url, unsplash_url
  FROM destinations
`;
const existing = new Map(existingRows.map((r) => [r.slug, r]));

if (!accessKey) {
  console.warn(
    "⚠️  UNSPLASH_ACCESS_KEY is not set — every new row gets a placeholder photo.",
  );
}

const placeholders = [];
let fetched = 0;
let reused = 0;

for (const [index, d] of DESTINATIONS.entries()) {
  const current = existing.get(d.slug);
  const hasRealPhoto =
    current && !isPlaceholder(current.image_url) && current.photographer_name;

  let photo = null;
  if (hasRealPhoto && !REFRESH) {
    reused++;
  } else {
    photo = await fetchPhoto(d);
    if (photo) fetched++;
    else placeholders.push(d.slug);
  }

  // With no new photo, fall back to what the row already has (and only then to
  // a placeholder), so a rate-limited run never downgrades a good photo. The
  // upsert can then write these columns unconditionally.
  const imageUrl = photo?.imageUrl ?? current?.image_url ?? placeholder(d.slug);
  const photographerName =
    photo?.photographerName ?? current?.photographer_name ?? null;
  const photographerUrl =
    photo?.photographerUrl ?? current?.photographer_url ?? null;
  const unsplashUrl = photo?.unsplashUrl ?? current?.unsplash_url ?? null;

  await sql`
    INSERT INTO destinations
      (slug, name, country, rating, image_url, photographer_name,
       photographer_url, unsplash_url, hero_title, hero_subtitle, description,
       sort_order)
    VALUES
      (${d.slug}, ${d.name}, ${d.country}, ${d.rating}, ${imageUrl},
       ${photographerName}, ${photographerUrl}, ${unsplashUrl},
       ${d.heroTitle ?? null}, ${d.heroSubtitle ?? null}, ${d.description},
       ${index})
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      country = EXCLUDED.country,
      rating = EXCLUDED.rating,
      image_url = EXCLUDED.image_url,
      photographer_name = EXCLUDED.photographer_name,
      photographer_url = EXCLUDED.photographer_url,
      unsplash_url = EXCLUDED.unsplash_url,
      hero_title = EXCLUDED.hero_title,
      hero_subtitle = EXCLUDED.hero_subtitle,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order
  `;
}

console.log(
  `✅ Seeded/updated ${DESTINATIONS.length} destinations ` +
    `(${fetched} photos fetched, ${reused} already had one).`,
);
if (rateLimited) {
  console.warn(
    "⚠️  Unsplash refused further requests (hourly quota). Re-run this script " +
      "in an hour to fill the rest — rows that already have a photo are skipped.",
  );
}
if (placeholders.length > 0) {
  console.warn(
    `⚠️  Still on a placeholder photo (${placeholders.length}): ` +
      placeholders.join(", "),
  );
}
