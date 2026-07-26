import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

// Resolve the base URL of our Expo Router API routes. In production set
// EXPO_PUBLIC_API_URL to the deployed *.expo.app origin. In development we hit
// the Metro dev server (which serves the +api.ts routes) at the LAN host Expo
// already knows — this works from the Android emulator and physical devices.
export function getApiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const hostUri =
    Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split("/")[0]; // strip any trailing path
    return `http://${host}`;
  }

  throw new Error(
    "Could not resolve the API base URL. Set EXPO_PUBLIC_API_URL.",
  );
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiInit = Omit<RequestInit, "body"> & {
  json?: unknown;
  formData?: FormData;
};

// Hook returning an authenticated fetch. Injects `Authorization: Bearer <token>`
// from Clerk and parses JSON, throwing ApiError (with the server message) on a
// non-2xx response. Pass `formData` instead of `json` to send a file upload —
// no Content-Type is set for it, so `fetch` fills in the multipart boundary.
export function useApiFetch() {
  const { getToken } = useAuth();

  return async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
    const { json, formData, headers, ...rest } = init;
    const token = await getToken();

    let res: Response;
    try {
      res = await fetch(`${getApiBaseUrl()}${path}`, {
        ...rest,
        headers: {
          Accept: "application/json",
          ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: json !== undefined ? JSON.stringify(json) : (formData ?? undefined),
      });
    } catch (networkErr) {
      Sentry.withScope((scope) => {
        scope.setTag("endpoint", path);
        scope.setExtra("kind", "network");
        Sentry.captureException(networkErr);
      });
      logFailure(path, rest.method ?? "GET", 0, "network");
      throw new ApiError(0, null, "Network error. Please check your connection.");
    }

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON response (e.g. an HTML error page) — surface + report it.
      const parseError = new ApiError(
        res.status,
        text,
        `Unexpected response from server (${res.status}).`,
      );
      report(path, res.status, parseError);
      logFailure(path, rest.method ?? "GET", res.status, "invalid_response");
      throw parseError;
    }

    if (!res.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : `Request failed (${res.status})`;
      const apiError = new ApiError(res.status, data, message);
      // Report unexpected server errors (5xx); skip expected 4xx (validation,
      // cap-reached, rate-limit — those are shown to the user in-app).
      if (res.status >= 500) report(path, res.status, apiError);
      logFailure(path, rest.method ?? "GET", res.status, "http_error");
      throw apiError;
    }

    return data as T;
  };
}

// Send an unexpected API failure to Sentry with endpoint context.
function report(path: string, status: number, error: unknown): void {
  Sentry.withScope((scope) => {
    scope.setTag("endpoint", path);
    scope.setTag("status", String(status));
    Sentry.captureException(error);
  });
}

// Log every failed request as a Sentry Log, regardless of status — this is
// the one chokepoint every API call flows through, so it gives full
// production visibility even for 4xx responses report() intentionally skips.
// `failureKind` is a fixed category, never the server-provided message text —
// that text is user-facing display copy (ApiError.message), not a value
// approved for telemetry.
type ApiFailureKind = "network" | "invalid_response" | "http_error";

function logFailure(
  path: string,
  method: string,
  status: number,
  failureKind: ApiFailureKind,
): void {
  Sentry.logger.warn("API request failed", {
    endpoint: path,
    method,
    status,
    failure_kind: failureKind,
  });
}
