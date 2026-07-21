import { QueryClient } from "@tanstack/react-query";

// Single app-wide Query client. Conservative defaults for a mobile app on
// free-tier backends: retry once, don't refetch on every screen focus.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
