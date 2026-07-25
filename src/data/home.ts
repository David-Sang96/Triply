// Mock content for the Home screen. UI-only placeholder data until the backend
// (trips, destinations, AI itineraries) is wired up. Images are remote Unsplash
// URLs served through expo-image; swap these for ImageKit-delivered assets later.

/** Build a sized Unsplash image URL from a photo id. */
const img = (id: string, w = 700) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const IMAGES = {
  fuji: img("1578637387939-43c525550085"),
  tokyo: img("1503899036084-c55cdd92da26"),
  kyoto: img("1545569341-9eb8b30979d9"),
  eiffel: img("1502602898657-3e91760cbb34"),
  santorini: img("1570077188670-e3a8d69ac5ff"),
  bali: img("1537996194471-e657df975ab4"),
};

export type Trip = {
  id: string;
  image: string;
  title: string;
  days: string;
  dates: string;
  travelers: string;
  budget: string;
};

export const TRIPS: Trip[] = [
  {
    id: "tokyo",
    image: IMAGES.fuji,
    title: "5 Days in Tokyo",
    days: "5 days",
    dates: "Apr 12 – Apr 16, 2024",
    travelers: "2 Travelers",
    budget: "Mid-range",
  },
  {
    id: "paris",
    image: IMAGES.eiffel,
    title: "Paris Getaway",
    days: "4 days",
    dates: "Mar 3 – Mar 7, 2024",
    travelers: "2 Travelers",
    budget: "Budget",
  },
];

export type Inspiration = {
  id: string;
  label: string;
  emoji: string;
  bg: string;
  // Matches an id in INTERESTS (src/data/generate.ts) — tapping this tile
  // pre-selects that interest on the Generate form. Not always the same
  // string as `id` above (e.g. "beach" -> "relaxation").
  interestId: string;
};

export const INSPIRATIONS: Inspiration[] = [
  { id: "food", label: "Food\nAdventures", emoji: "🍜", bg: "#FFF1E6", interestId: "food" },
  { id: "nature", label: "Nature\nEscapes", emoji: "🏔️", bg: "#E9F6EE", interestId: "nature" },
  { id: "culture", label: "Cultural\nJourneys", emoji: "🎎", bg: "#FDECEF", interestId: "culture" },
  { id: "beach", label: "Beach\nRelaxation", emoji: "🏝️", bg: "#E7F3FB", interestId: "relaxation" },
  { id: "night", label: "Vibrant\nNightlife", emoji: "🌃", bg: "#EFEAFB", interestId: "nightlife" },
];
