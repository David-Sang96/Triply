import * as SecureStore from "expo-secure-store";

// Token cache for ClerkProvider, replacing `tokenCache` from
// `@clerk/expo/token-cache`.
//
// Why replace Clerk's at all: Clerk's `saveToken` calls
// `SecureStore.setItemAsync` with no error handling, so a failed write is
// silent, and its `getToken` swallows a read error and then deletes the key.
// When a session goes missing there is nothing in the log to say which of those
// happened. This does what Clerk's does, and reports failures.
//
// It deliberately does NOT split the value into chunks. An earlier version did,
// to work around a 2048-byte Android limit — but that limit does not exist:
// expo-secure-store 57.0.1 has no length check in its Android native code, and
// the SDK 57 docs say "Expo does not enforce a limit" (the historical ~2048
// figure was iOS). The real device token measures 518 characters. Chunking
// bought nothing and cost two things:
//
//   1. Writes stopped being atomic. Saving cleared the old chunks before
//      writing the new ones, so a process death in that window — which is what
//      swiping the app out of Recents does — left no readable session at all.
//      Overlapping saves could also leave chunk 0 from one and chunk 1 from
//      another: a spliced, invalid token that passed the integrity check
//      because no chunk was *missing*.
//   2. Reads got slower. Clerk gives the cache ONE SECOND to return the token
//      on startup (`tokenCacheReadTimeoutMs` in @clerk/expo's
//      nativeClientSync) and treats a slower read as "no stored session".
//      Reading a count and then the chunks is two round trips through the
//      Android keystore instead of one, on the coldest possible path.
//
// Note for future debugging: a lost session is usually NOT this file. Measured
// on a real device it returns the token on every cold start in 9-159ms with no
// failures, while sessions were still being lost — the cause was Clerk's native
// client sync, and the fix was `@clerk/expo` v4. See AGENTS.md.
//
// Logging stays on the device (console, not Sentry), so no token material
// becomes telemetry — see the policy in AGENTS.md.

const OPTIONS: SecureStore.SecureStoreOptions = {
  // Matches Clerk's own cache: readable after the first unlock following a
  // restart, so a background token refresh works on a locked device. iOS-only
  // (Android ignores it), but dropping it would be a silent iOS regression.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// --- legacy chunked layout -------------------------------------------------
// Read-and-migrate only, so a session written by the chunked version survives
// the upgrade instead of silently signing the user out.
const COUNT_SUFFIX = "__chunks";

function chunkKey(key: string, index: number) {
  return `${key}__${index}`;
}

async function readLegacyChunked(key: string): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(`${key}${COUNT_SUFFIX}`, OPTIONS);
  if (!raw) return null;

  const count = Number.parseInt(raw, 10);
  if (!Number.isInteger(count) || count < 1) return null;

  const parts = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      SecureStore.getItemAsync(chunkKey(key, i), OPTIONS),
    ),
  );

  // A missing chunk means a partial write. Half a token is worse than none: it
  // fails verification in a way that looks like an auth bug rather than a
  // storage one.
  if (parts.some((part) => part === null)) {
    console.error(
      `tokenCache: legacy ${key} was incomplete ` +
        `(${parts.filter(Boolean).length}/${count} chunks) — discarding`,
    );
    await clearLegacyChunked(key, count);
    return null;
  }

  return parts.join("");
}

async function clearLegacyChunked(key: string, count: number) {
  await Promise.all([
    SecureStore.deleteItemAsync(`${key}${COUNT_SUFFIX}`, OPTIONS),
    ...Array.from({ length: count }, (_, i) =>
      SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS),
    ),
  ]);
}

// Best effort: enough chunk keys to cover any token the old 1024-char split
// could have produced. Leftovers are harmless — nothing reads them once the
// count marker is gone — so a failure here is not worth reporting.
async function discardLegacyChunked(key: string) {
  try {
    await clearLegacyChunked(key, 32);
  } catch {
    // ignore
  }
}

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key, OPTIONS);
      if (value !== null) return value;

      // Nothing under the single key: this may be a session stored by the
      // chunked version. Reassemble it, then rewrite it as one value so the
      // slow path runs at most once.
      const legacy = await readLegacyChunked(key);
      if (legacy === null) return null;

      await SecureStore.setItemAsync(key, legacy, OPTIONS);
      await discardLegacyChunked(key);
      return legacy;
    } catch (err) {
      // Clerk's cache deletes the key here. Keep the value: a read can fail
      // for reasons that pass (a locked device, keystore contention), and
      // deleting turns a recoverable miss into a permanent sign-out.
      console.error(`tokenCache: read failed for ${key}:`, err);
      return null;
    }
  },

  async saveToken(key: string, token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, token, OPTIONS);
    } catch (err) {
      // The failure Clerk's implementation swallows. Logged rather than thrown:
      // an unwritable token costs the session on next launch, which is worth
      // reporting but not worth crashing a working session over.
      console.error(
        `tokenCache: save failed for ${key} (${token.length} chars):`,
        err,
      );
    }
  },

  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key, OPTIONS);
      await discardLegacyChunked(key);
    } catch (err) {
      console.error(`tokenCache: clear failed for ${key}:`, err);
    }
  },
};
