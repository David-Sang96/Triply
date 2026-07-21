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

export type HeroSlide = {
  id: string;
  image: string;
  /** Two-line headline. */
  title: string;
  subtitle: string;
};

// The hero rotates image + text together every 3s. The first slide matches the
// static design so the screen reads identically before the carousel advances.
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "fuji",
    image: img("1578637387939-43c525550085", 1000),
    title: "Where will your\nnext adventure be?",
    subtitle: "AI will craft the perfect itinerary for you.",
  },
  {
    id: "santorini",
    image: img("1570077188670-e3a8d69ac5ff", 1000),
    title: "Chasing Greek\nisland sunsets?",
    subtitle: "Let AI plan your Santorini escape.",
  },
  {
    id: "paris",
    image: img("1502602898657-3e91760cbb34", 1000),
    title: "Ready to fall\nfor Paris?",
    subtitle: "Cafés, museums and hidden gems, planned.",
  },
  {
    id: "bali",
    image: img("1537996194471-e657df975ab4", 1000),
    title: "Temples and\nBali beaches?",
    subtitle: "Your island itinerary, made in seconds.",
  },
];

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

export type Destination = {
  id: string;
  image: string;
  name: string;
  country: string;
  rating: string;
};

export const DESTINATIONS: Destination[] = [
  { id: "tokyo", image: IMAGES.tokyo, name: "Tokyo", country: "Japan", rating: "4.8" },
  { id: "kyoto", image: IMAGES.kyoto, name: "Kyoto", country: "Japan", rating: "4.7" },
  { id: "bali", image: IMAGES.bali, name: "Bali", country: "Indonesia", rating: "4.6" },
  { id: "santorini", image: IMAGES.santorini, name: "Santorini", country: "Greece", rating: "4.8" },
];

export type Inspiration = {
  id: string;
  label: string;
  emoji: string;
  bg: string;
};

export const INSPIRATIONS: Inspiration[] = [
  { id: "food", label: "Food\nAdventures", emoji: "🍜", bg: "#FFF1E6" },
  { id: "nature", label: "Nature\nEscapes", emoji: "🏔️", bg: "#E9F6EE" },
  { id: "culture", label: "Cultural\nJourneys", emoji: "🎎", bg: "#FDECEF" },
  { id: "beach", label: "Beach\nRelaxation", emoji: "🏝️", bg: "#E7F3FB" },
  { id: "night", label: "Vibrant\nNightlife", emoji: "🌃", bg: "#EFEAFB" },
];
