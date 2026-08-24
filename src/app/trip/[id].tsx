import * as Sentry from "@sentry/react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

import { GenerationError } from "@/components/trip/GenerationError";
import { GenerationLoading } from "@/components/trip/GenerationLoading";
import { TripDetailView } from "@/components/trip/TripDetailView";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { ApiError } from "@/lib/api";
import { useDeleteTrip, useRetryTrip, useTrip, useTripStatus } from "@/lib/trips";
import { colors } from "@/theme/colors";

function Centered() {
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

// One screen for the whole lifecycle of a trip: it polls status, shows the
// loading steps while generating, an error + retry on failure, and the full
// itinerary once ready.
// Turns what the server reports into copy in the active language.
//
// The order matters. A CODE is preferred because it can be translated. The
// stored MESSAGE is the legacy path: rows written before error_code existed
// carry English prose, and showing that beats showing nothing. Only when
// there is neither does the generic fallback apply.
function failureMessage(
  code: string | null,
  message: string | null,
  t: TFunction,
): string {
  switch (code) {
    case "ai_rate_limited":
      return t("generation.failureAiRateLimited");
    case "generation_failed":
      return t("generation.failureGenerationFailed");
    case "enqueue_failed":
      return t("generation.failureEnqueueFailed");
    default:
      return message ?? t("generation.failureDefault");
  }
}

export default function TripScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tripId = typeof id === "string" ? id : "";

  const queryClient = useQueryClient();
  const deleteTrip = useDeleteTrip();
  const retryTrip = useRetryTrip(tripId);

  const statusQuery = useTripStatus(tripId, tripId.length > 0);
  const status = statusQuery.data?.status;
  const isReady = status === "ready";

  const tripQuery = useTrip(tripId, isReady);

  const onDelete = () =>
    deleteTrip.mutate(tripId, {
      onSuccess: () => (router.canGoBack() ? router.back() : router.replace("/")),
      onError: (err) =>
        Alert.alert(
          t("generation.deleteFailed"),
          err instanceof ApiError ? err.message : t("assistant.pleaseTryAgain"),
        ),
    });

  // When generation finishes (ready or failed), refresh the Home trips list so
  // the new trip and its cover image show up there.
  const failedMessage = statusQuery.data?.errorMessage ?? null;
  useEffect(() => {
    if (status === "ready" || status === "failed") {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    }
    if (status === "failed") {
      Sentry.withScope((scope) => {
        scope.setLevel("warning");
        scope.setTag("feature", "trip-generation");
        scope.setExtra("tripId", tripId);
        scope.setExtra("errorMessage", failedMessage);
        Sentry.captureMessage("Trip generation failed");
      });
    }
  }, [status, queryClient, tripId, failedMessage]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  // Re-runs the same trip with the parameters it already has. The screen does
  // not navigate: the status query flips back to "queued" and the loading steps
  // take over. If the retry is refused (the cap is full because the trip stops
  // being exempt once it is queued again), say so and stay put — sending the
  // user to the create screen would only fail there too.
  const onRetry = () =>
    retryTrip.mutate(undefined, {
      onError: (err) =>
        Alert.alert(
          t("generation.retryFailed"),
          err instanceof ApiError ? err.message : t("assistant.pleaseTryAgain"),
        ),
    });

  if (statusQuery.isLoading || !status) {
    return <Centered />;
  }

  if (status === "failed") {
    return (
      <GenerationError
        message={failureMessage(
          statusQuery.data?.errorCode ?? null,
          statusQuery.data?.errorMessage ?? null,
          t,
        )}
        onRetry={onRetry}
        retrying={retryTrip.isPending}
        onBack={goBack}
      />
    );
  }

  if (!isReady) {
    return <GenerationLoading status={status} onBack={goBack} />;
  }

  if (tripQuery.isLoading || !tripQuery.data) {
    return <Centered />;
  }

  return (
    <TripDetailView
      trip={tripQuery.data}
      onBack={goBack}
      onDelete={onDelete}
      onAskAi={() =>
        router.push({
          pathname: "/chat",
          params: { tripId, dest: tripQuery.data.destination },
        })
      }
      deleting={deleteTrip.isPending}
    />
  );
}
