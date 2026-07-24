import { useQuery } from "@tanstack/react-query";

import { useApiFetch } from "./api";

export type Destination = {
  id: string;
  slug: string;
  name: string;
  country: string;
  rating: string;
  imageUrl: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
};

export type HeroSlide = {
  id: string;
  image: string;
  title: string;
  subtitle: string;
};

// Curated Home-screen content — same for every user, so a long staleTime
// avoids refetching every time the Home screen regains focus.
export function useDestinations() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["destinations"],
    queryFn: () =>
      apiFetch<{ destinations: Destination[] }>("/api/destinations").then(
        (r) => r.destinations,
      ),
    staleTime: 10 * 60 * 1000,
  });
}
