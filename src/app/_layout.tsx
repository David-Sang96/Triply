import { ClerkProvider } from "@clerk/expo";

import {
  NotoSansMyanmar_400Regular,
  NotoSansMyanmar_500Medium,
  NotoSansMyanmar_600SemiBold,
  NotoSansMyanmar_700Bold,
} from "@expo-google-fonts/noto-sans-myanmar";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack, useNavigationContainerRef } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SplashScreenView } from "@/components/SplashScreenView";
import "@/lib/i18n";
import {
  loadStoredPreferences,
  PreferencesProvider,
  type Preferences,
} from "@/lib/preferences";
import { queryClient, useAppStateFocus } from "@/lib/query";
import { tokenCache } from "@/lib/token-cache";

import "../../global.css";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env file");
}

// Per-screen route transactions (Time To Initial Display). This SDK version
// predates Sentry.expoRouterIntegration(), so it's wired manually to Expo
// Router's nav ref below via registerNavigationContainer.
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

// Records a short replay leading up to a captured exception (not every
// session — see replaysOnErrorSampleRate below). Defaults to masking all
// text, images, and vectors, so no per-screen masking config is needed.
const replayIntegration = Sentry.mobileReplayIntegration();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // PII (e.g. IP address) only in development — keep it off in released builds.
  sendDefaultPii: __DEV__,
  // Sample all transactions in development, a small fraction in production.
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  // Send Sentry.logger.* calls to Sentry (see src/lib/api.ts, src/lib/trips.ts).
  enableLogs: true,
  // Capture a replay for every session that hits a captured exception, rather
  // than sampling all sessions — smaller footprint, same debugging value for
  // the common case. Scaled down in production to manage replay volume/cost
  // once real traffic exists.
  replaysOnErrorSampleRate: __DEV__ ? 1.0 : 0.5,
  // Also sample a small slice of ALL sessions (error or not) — catches UX bugs
  // that never throw (e.g. a stuck UI element), which replaysOnErrorSampleRate
  // alone would miss. Kept low: replay quota is usually a plan's tightest
  // limit, and today's traffic doesn't need more to spot a recurring issue.
  replaysSessionSampleRate: __DEV__ ? 0.1 : 0.01,
  // Merges with (doesn't replace) the default integrations, which already
  // cover app start, fetch/XHR spans, native frames, and JS stalls.
  integrations: [navigationIntegration, replayIntegration],
});

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    // Burmese. Poppins has no Myanmar glyphs at all, so without these the app
    // would fall back to whatever the device has — which on Myanmar phones is
    // often a Zawgyi-encoded font that renders Unicode Burmese as garbage.
    NotoSansMyanmar_400Regular,
    NotoSansMyanmar_500Medium,
    NotoSansMyanmar_600SemiBold,
    NotoSansMyanmar_700Bold,
  });
  const navigationRef = useNavigationContainerRef();

  // The saved language has to be applied BEFORE the first frame, or a Burmese
  // user sees a flash of English. There is already a gate here for fonts, so
  // this joins it rather than adding a second loading state.
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  useEffect(() => {
    loadStoredPreferences().then(setPreferences);
  }, []);

  // Stops trip-status polling while the app is backgrounded. React Query cannot
  // work this out by itself on React Native — see the note in src/lib/query.ts.
  useAppStateFocus();

  const ready = fontsLoaded && preferences !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    navigationIntegration.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  // The native splash (expo-splash-screen) still covers the screen at this
  // point — hideAsync only runs once the fonts and the stored language are in
  // — so this render is what is revealed underneath it, already painted in the
  // right font and the right language.
  if (!ready) return <SplashScreenView />;

  return (
    // Required for react-native-gesture-handler's Swipeable (chats.tsx) to
    // reliably receive pan gestures, especially on Android.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PreferencesProvider initial={preferences}>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "#FFFFFF" },
                }}
              />
            </SafeAreaProvider>
          </QueryClientProvider>
        </ClerkProvider>
      </PreferencesProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
