import * as SecureStore from "expo-secure-store";

// Token cache for ClerkProvider, replacing `tokenCache` from
// `@clerk/expo/token-cache`.
//
// Why: Clerk's own implementation calls `SecureStore.setItemAsync` with no error
// handling, so a failed write is silent. On Android, expo-secure-store refuses
// values over 2048 bytes. That combination means an oversized token is simply
// never stored and the user is signed out on every restart, with nothing logged
// anywhere to say why.
//
// It surfaced when this app moved to a Clerk production instance: the
// development instance's client token fitted, production's did not. Sessions
// piled up server-side — one user had three active at once — while the app
// forgot each of them.
//
// So values are stored in chunks small enough to always fit, and every failure
// is logged. The log stays on the device (console.error, not Sentry), so no
// token material becomes telemetry — see the policy in AGENTS.md.

// Comfortably under the 2048-byte limit. Chunks are measured in characters, and
// a multi-byte character costs more than one byte, so the margin is deliberate.
const CHUNK_SIZE = 1024;

// Suffix marking how many chunks a key was split into. SecureStore keys allow
// alphanumerics, ".", "-" and "_", so this is a safe thing to append.
const COUNT_SUFFIX = "__chunks";

function chunkKey(key: string, index: number) {
  return `${key}__${index}`;
}

async function readCount(key: string): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(`${key}${COUNT_SUFFIX}`);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function clearChunks(key: string, count: number) {
  await Promise.all([
    SecureStore.deleteItemAsync(`${key}${COUNT_SUFFIX}`),
    ...Array.from({ length: count }, (_, i) =>
      SecureStore.deleteItemAsync(chunkKey(key, i)),
    ),
  ]);
}

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      const count = await readCount(key);

      // No chunk marker: either nothing stored, or a value written by Clerk's
      // own cache before this replaced it. Read it directly so an existing
      // session survives the upgrade.
      if (count === null) return await SecureStore.getItemAsync(key);

      const parts = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.getItemAsync(chunkKey(key, i)),
        ),
      );

      // A missing chunk means a partial write — an interrupted save, or storage
      // cleared underneath us. Half a token is worse than none: it would fail
      // verification in a way that looks like an auth bug rather than a storage
      // one. Discard it and let the user sign in again.
      if (parts.some((p) => p === null)) {
        console.error(
          `tokenCache: ${key} was incomplete (${parts.filter(Boolean).length}/${count} chunks) — discarding`,
        );
        await clearChunks(key, count);
        return null;
      }

      return parts.join("");
    } catch (err) {
      console.error(`tokenCache: read failed for ${key}:`, err);
      return null;
    }
  },

  async saveToken(key: string, token: string): Promise<void> {
    try {
      // Clear a previous value first, so a shorter token cannot leave stale
      // chunks behind that a later read would splice onto it.
      const previous = await readCount(key);
      if (previous !== null) await clearChunks(key, previous);
      else await SecureStore.deleteItemAsync(key);

      const chunks: string[] = [];
      for (let i = 0; i < token.length; i += CHUNK_SIZE) {
        chunks.push(token.slice(i, i + CHUNK_SIZE));
      }

      // Chunks before the count: if this is interrupted, the absent count means
      // getToken reads nothing rather than reassembling a partial token.
      await Promise.all(
        chunks.map((part, i) => SecureStore.setItemAsync(chunkKey(key, i), part)),
      );
      await SecureStore.setItemAsync(
        `${key}${COUNT_SUFFIX}`,
        String(chunks.length),
      );
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
      const count = await readCount(key);
      if (count !== null) await clearChunks(key, count);
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.error(`tokenCache: clear failed for ${key}:`, err);
    }
  },
};
