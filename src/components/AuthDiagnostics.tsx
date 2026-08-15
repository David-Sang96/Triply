import { useAuth, useClerk } from "@clerk/expo";
import { useEffect } from "react";

// TEMPORARY diagnostics for one open question: a Google-SSO session on the
// production Clerk instance does not survive a restart, while an
// email/password session on the same instance does.
//
// The token cache has been ruled out. It stores and returns the device token on
// every cold start (518 chars, 10-84ms, never cleared, never null). But a
// device token only identifies the *client*; the session is what hangs off it,
// and Clerk gets that from the server when it loads the client. So the question
// is no longer "was the token saved" but "does the client that token identifies
// still own a signed-in session".
//
// This logs exactly that, on every auth state change. Everything here is an id,
// a boolean, a count or a fixed status string — the categories AGENTS.md allows
// in telemetry — and it goes to the device console rather than Sentry anyway.
//
// Delete this file, and its use in src/app/_layout.tsx, once the cause is found.
export function AuthDiagnostics() {
  const { isLoaded, isSignedIn, sessionId, userId } = useAuth();
  const clerk = useClerk();

  useEffect(() => {
    // `signedInSessions` is what @clerk/expo's own native-sync code reads to
    // decide whether to restore a session, so it is the number that matters.
    const client = clerk?.client as
      | { signedInSessions?: unknown[]; lastActiveSessionId?: string | null }
      | undefined;

    console.log(
      "authDiag: " +
        [
          `loaded=${isLoaded}`,
          `signedIn=${isSignedIn}`,
          `status=${clerk?.status ?? "unknown"}`,
          `session=${sessionId ?? "none"}`,
          `user=${userId ?? "none"}`,
          `clientSessions=${client?.signedInSessions?.length ?? "unknown"}`,
          `lastActive=${client?.lastActiveSessionId ?? "none"}`,
        ].join(" "),
    );
  }, [isLoaded, isSignedIn, sessionId, userId, clerk]);

  return null;
}
