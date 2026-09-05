import { useQuery } from "@tanstack/react-query";

import { useApiFetch } from "./api";

export type Rates = Record<string, number>;

/**
 * Exchange rates against USD, for drawing a cost stored in dollars in the
 * currency the user picked on the Profile screen.
 *
 * The same values for every user and refreshed upstream once a day, so the
 * app-wide 30s `staleTime` in src/lib/query.ts would be wrong here — it would
 * refetch on nearly every screen to receive a number that has not moved.
 *
 * Failure is not treated as exceptional. `useRates().data` is undefined while
 * loading and after an error alike, and every caller of `formatMoney` falls
 * back to dollars in that case, so there is nothing here to catch and nothing
 * to show the user. A missing rate must never become a wrong price.
 */
export function useRates() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["fx-rates"],
    queryFn: () =>
      apiFetch<{ base: string; rates: Rates; updatedAt: string | null }>(
        "/api/rates",
      ).then((r) => r.rates),
    staleTime: 12 * 60 * 60 * 1000,
  });
}
