import * as Sentry from "@sentry/react-native";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useApiFetch } from "./api";
import { useLanguage } from "./preferences";

// Client-side mirrors of the server shapes (kept plain so no server/db code is
// pulled into the app bundle).
export type TripStatus =
  | "queued"
  | "generating"
  | "enriching"
  | "imaging"
  | "finalizing"
  | "ready"
  | "failed";

export type BudgetLevel = "Budget" | "Mid-range" | "Luxury";
export type TimeOfDay = "morning" | "afternoon" | "evening";

export type TripListItem = {
  id: string;
  destination: string;
  title: string | null;
  status: TripStatus;
  coverImageUrl: string | null;
  customCoverImageUrl: string | null;
  useCustomCover: boolean;
  numDays: number;
  numTravelers: number;
  budgetLevel: BudgetLevel;
  errorMessage: string | null;
  createdAt: string;
};

export type Activity = {
  id: string;
  timeOfDay: TimeOfDay;
  name: string;
  description: string | null;
  estCostUsd: number | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  placeVerified: boolean;
  sortOrder: number;
};

export type Day = {
  id: string;
  dayNumber: number;
  themeTitle: string | null;
  activities: Activity[];
};

export type TripImage = {
  url: string;
  photographerName: string;
  photographerUrl: string;
  unsplashUrl: string;
};

export type TripDetail = TripListItem & {
  summary: string | null;
  pace: string | null;
  interests: string[];
  days: Day[];
  coverImagePhotographerName: string | null;
  coverImagePhotographerUrl: string | null;
  coverImageUnsplashUrl: string | null;
  images: TripImage[] | null;
};

export type CreateTripInput = {
  destination: string;
  numDays: number;
  numTravelers: number;
  budgetLevel: BudgetLevel;
  interests: string[];
  pace: string | null;
};

const TERMINAL: TripStatus[] = ["ready", "failed"];

export function useTrips() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["trips"],
    queryFn: () =>
      apiFetch<{ trips: TripListItem[] }>("/api/trips").then((r) => r.trips),
  });
}

export function useCreateTrip() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  // Read here rather than at the call site so every caller sends it and none
  // can forget. The server stores it on the trip, so a retry regenerates in
  // the same language and switching language later leaves old trips alone.
  const language = useLanguage();
  return useMutation({
    mutationFn: (input: CreateTripInput) =>
      apiFetch<{ id: string }>("/api/trips", {
        method: "POST",
        json: { ...input, language },
      }),
    onSuccess: (data, input) => {
      Sentry.logger.info("Trip requested", {
        trip_id: data.id,
        // Boolean, not the raw destination text the user typed.
        has_destination: Boolean(input.destination),
        num_days: input.numDays,
        num_travelers: input.numTravelers,
        budget_tier: input.budgetLevel,
        interest_count: input.interests.length,
        pace: input.pace ?? "balanced",
      });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

// Polls the lightweight status endpoint every 3s, stopping on a terminal state
// to protect the free-tier request budget.
export function useTripStatus(id: string, enabled: boolean) {
  const apiFetch = useApiFetch();
  const query = useQuery({
    queryKey: ["trip", id, "status"],
    enabled,
    queryFn: () =>
      apiFetch<{
        status: TripStatus;
        errorCode: string | null;
        errorMessage: string | null;
      }>(
        `/api/trips/${id}/status`,
      ),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL.includes(status) ? false : 3000;
    },
  });

  const status = query.data?.status;
  // Guards against re-logging on every poll tick / re-render — logs once per
  // trip id the first time its status resolves to a terminal state.
  const loggedForId = useRef<string | null>(null);
  useEffect(() => {
    if (!status) return;
    // A retry puts the trip back into a live status. Clear the guard so the
    // next terminal state logs again — without this, a retry that also fails
    // is invisible in Sentry, which is exactly the case worth seeing.
    if (!TERMINAL.includes(status)) {
      loggedForId.current = null;
      return;
    }
    if (loggedForId.current === id) return;
    loggedForId.current = id;
    if (status === "ready") {
      Sentry.logger.info("Trip generation succeeded", { trip_id: id });
    } else {
      Sentry.logger.error("Trip generation failed", {
        trip_id: id,
        // Fixed category, not the server's errorMessage — that's user-facing
        // display copy (friendlyError() in src/server/inngest/functions.ts),
        // and the server exposes no machine-readable error code to
        // categorize further than this.
        failure_kind: "generation_failed",
      });
    }
  }, [status, id]);

  return query;
}

// Re-runs generation for a failed trip, re-using the parameters already on the
// row. The server keeps the same trip id, so the screen stays where it is and
// simply goes back to showing the loading steps.
export function useRetryTrip(id: string) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>(`/api/trips/${id}/retry`, { method: "POST" }),
    onSuccess: () => {
      Sentry.logger.info("Trip generation retried", { trip_id: id });
      // useTripStatus stops its interval on a terminal status, and the interval
      // function is only re-evaluated when the cached data changes. Nothing
      // refetches on its own at that point, so the retry has to kick the query
      // itself — otherwise the screen would sit on the error forever while the
      // job ran happily in the background.
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

export function useTrip(id: string, enabled: boolean) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["trip", id],
    enabled,
    queryFn: () =>
      apiFetch<{ trip: TripDetail }>(`/api/trips/${id}`).then((r) => r.trip),
  });
}

export function useDeleteTrip() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/api/trips/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });
}

export function useUploadTripCover(id: string) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<{ customCoverImageUrl: string; useCustomCover: boolean }>(
        `/api/trips/${id}/cover`,
        { method: "POST", formData },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

export function useToggleTripCover(id: string) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (useCustomCover: boolean) =>
      apiFetch<{ useCustomCover: boolean }>(`/api/trips/${id}/cover`, {
        method: "PATCH",
        json: { useCustomCover },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}
