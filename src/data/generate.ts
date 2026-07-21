import type MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

// Form options for the "Generate a trip" screen. UI-only for now — the actual
// itinerary generation is wired up in a later phase.

export const BUDGETS = ["Budget", "Mid-range", "Luxury"] as const;
export type Budget = (typeof BUDGETS)[number];

export type Interest = {
  id: string;
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
};

export const MAX_INTERESTS = 5;

export const INTERESTS: Interest[] = [
  { id: "food", label: "Food", icon: "silverware-fork-knife", color: "#2E6BE6" },
  { id: "history", label: "History", icon: "bank", color: "#2563EB" },
  { id: "nature", label: "Nature", icon: "leaf", color: "#22A45D" },
  { id: "nightlife", label: "Nightlife", icon: "glass-cocktail", color: "#8B5CF6" },
  { id: "adventure", label: "Adventure", icon: "image-filter-hdr", color: "#F97316" },
  { id: "culture", label: "Culture", icon: "town-hall", color: "#E5484D" },
  { id: "shopping", label: "Shopping", icon: "shopping", color: "#EC4899" },
  { id: "relaxation", label: "Relaxation", icon: "umbrella-beach", color: "#14B8A6" },
];

export type Pace = {
  id: string;
  label: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
};

export const PACES: Pace[] = [
  {
    id: "relaxed",
    label: "Relaxed",
    description: "Fewer stops, more downtime",
    icon: "leaf-outline",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "A comfortable mix each day",
    icon: "walk-outline",
  },
  {
    id: "fast",
    label: "Fast-paced",
    description: "See as much as you can",
    icon: "flash-outline",
  },
];
