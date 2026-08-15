import * as SecureStore from "expo-secure-store";

// Token cache for ClerkProvider, replacing `tokenCache` from
// `@clerk/expo/token-cache`.
//
// Why replace Clerk's at all: Clerk's `saveToken` calls
// `SecureStore.setItemAsync` with no error handling, so a failed write is
// silent, and its `getToken` swallows a read error and deletes the key. When a
// session goes missing there is nothing in the log to say which of those
// happened. This version does exactly what Clerk's does, and reports it.
//
// It deliberately does NOT split the value into chunks. An earlier version did,
// to work around a 2048-byte Android limit — but that limit does not exist:
// expo-secure-store 57.0.1 has no length check in its Android native code, and
// the SDK 57 docs say "Expo does not enforce a limit" (the historical ~2048
// figure was iOS). Chunking bought nothing and cost two things:
//
//   1. Writes stopped being atomic. Clerk saves the client JWT from the auth
//      header of every FAPI response, so saves overlap. Interleaved, two saves
//      could leave chunk 0 from one and chunk 1 from the other — a spliced,
//      invalid JWT. Every chunk was present, so the integrity check passed and
//      nothing was logged. One key cannot splice: a later write replaces the
//      whole value, and either value is complete.
//   2. Reads got slower. Clerk gives the cache ONE SECOND to return the client
//      JWT on startup (`tokenCacheReadTimeoutMs` in @clerk/expo's
//      nativeClientSync) and treats a slower read as "no stored session".
//      Reading a count and then the chunks is two round trips through the
//      Android keystore instead of one, on the coldest possible path.
//
// Logging stays on the device (console, not Sentry), so no token material
// becomes telemetry — see the policy in AGENTS.md. Only lengths, durations and
// key names are logged, never a token.

const OPTIONS: SecureStore.SecureStoreOptions = {
  // Matches Clerk's own cache: readable after the first unlock following a
  // restart, so a background token refresh works on a locked device. iOS-only
  // (Android ignores it), but dropping it would be a silent iOS regression.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// --- diagnostics -----------------------------------------------------------
// TEMPORARY. Here to answer one question: when a Google-SSO session does not
// survive a restart, is the token absent, slow to read, or actively cleared?
// Remove once that is settled — the failure logging below is the part worth
// keeping.
const DIAGNOSTICS = true;

function diag(message: string) {
  if (DIAGNOSTICS) console.log(`tokenCache: ${message}`);
}

// --- legacy chunked layout -------------------------------------------------
// Read-and-migrate only, so a session written by the chunked version survives
// this upgrade instead of silently signing the user out.
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
    diag(`legacy ${key} incomplete (${parts.filter(Boolean).length}/${count})`);
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
// could have produced. Leftovers are harmless (nothing reads them once the
// count marker is gone), so a failure here is not worth reporting.
async function discardLegacyChunked(key: string) {
  try {
    await clearLegacyChunked(key, 32);
  } catch {
    // ignore
  }
}

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    const startedAt = Date.now();
    try {
      let value = await SecureStore.getItemAsync(key, OPTIONS);
      let source = "single";

      // Nothing under the single key: this may be a session stored by the
      // chunked version. Reassemble it, then rewrite it as one value so the
      // slow path runs at most once.
      if (value === null) {
        value = await readLegacyChunked(key);
        if (value !== null) {
          source = "legacy-chunked";
          await SecureStore.setItemAsync(key, value, OPTIONS);
          await discardLegacyChunked(key);
        }
      }

      diag(
        `get ${key} -> ${value === null ? "null" : `${value.length} chars`} ` +
          `(${source}) in ${Date.now() - startedAt}ms`,
      );
      return value;
    } catch (err) {
      // Clerk's cache deletes the key here. Keep the value: a read can fail
      // for reasons that pass (a locked device, keystore contention), and
      // deleting turns a recoverable miss into a permanent sign-out.
      console.error(
        `tokenCache: read failed for ${key} after ${Date.now() - startedAt}ms:`,
        err,
      );
      return null;
    }
  },

  async saveToken(key: string, token: string): Promise<void> {
    const startedAt = Date.now();
    try {
      await SecureStore.setItemAsync(key, token, OPTIONS);
      diag(`save ${key} (${token.length} chars) in ${Date.now() - startedAt}ms`);
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
      // Logged loudly: @clerk/expo clears the client JWT by itself in two
      // places — when it decides the publishable key changed, and when a FAPI
      // request comes back unauthenticated while the native SDK has no device
      // token. Either one signs the user out, and neither says so.
      diag(`CLEARED ${key}`);
    } catch (err) {
      console.error(`tokenCache: clear failed for ${key}:`, err);
    }
  },
};
