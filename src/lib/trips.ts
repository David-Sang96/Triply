import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useApiFetch } from "./api";

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
  customCoverImageUrl: string | null;
  useCustomCover: boolean;
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
  return useMutation({
    mutationFn: (input: CreateTripInput) =>
      apiFetch<{ id: string }>("/api/trips", { method: "POST", json: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });
}

// Polls the lightweight status endpoint every 3s, stopping on a terminal state
// to protect the free-tier request budget.
export function useTripStatus(id: string, enabled: boolean) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["trip", id, "status"],
    enabled,
    queryFn: () =>
      apiFetch<{ status: TripStatus; errorMessage: string | null }>(
        `/api/trips/${id}/status`,
      ),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL.includes(status) ? false : 3000;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", id] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", id] }),
  });
}
