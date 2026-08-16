import { focusManager, QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

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

/**
 * Tells React Query when the app is in the foreground, so `refetchInterval`
 * stops firing while it is backgrounded.
 *
 * Without this, trip-status polling (`useTripStatus`, every 3s) keeps running
 * after the user switches away — draining battery and burning the free-tier
 * request budget for a screen nobody is looking at. That also counts against
 * the Cloudflare subrequest limit, since each poll hits a route that queries
 * Neon (see "Known limits" in docs/RELEASE.md).
 *
 * Why it is not automatic: React Query gates every interval tick on
 * `focusManager.isFocused()` —
 *
 *   setInterval(() => {
 *     if (options.refetchIntervalInBackground || focusManager.isFocused()) fetch()
 *   }, interval)
 *
 * — and `isFocused()` falls back to `globalThis.document?.visibilityState !==
 * "hidden"` when nothing has set it explicitly. React Native has no `document`,
 * so that comparison is `undefined !== "hidden"`, which is **true forever**.
 * The default `refetchIntervalInBackground: false` therefore has no effect at
 * all until something calls `setFocused`. That something is this hook.
 *
 * Safe to add because `refetchOnWindowFocus` is already false above: this only
 * gates interval polling, and returning to the foreground does not trigger a
 * burst of refetches across every mounted query.
 *
 * Call once, at the app root. Per the React Native guidance in the React Query
 * docs; `Platform.OS !== "web"` because the browser has real focus events and
 * overriding them there would be worse than leaving them alone.
 */
export function useAppStateFocus() {
  useEffect(() => {
    const onAppStateChange = (status: AppStateStatus) => {
      if (Platform.OS !== "web") {
        focusManager.setFocused(status === "active");
      }
    };

    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => subscription.remove();
  }, []);
}
