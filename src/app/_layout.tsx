import { Stack } from "expo-router";
import * as Sentry from "@sentry/react-native";

import "../../global.css";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Sends personally identifiable info (e.g. IP address). See the Sentry docs.
  sendDefaultPii: true,
  // Capture 100% of transactions in development. Lower this in production.
  tracesSampleRate: 1.0,
});

function RootLayout() {
  return <Stack />;
}

export default Sentry.wrap(RootLayout);
