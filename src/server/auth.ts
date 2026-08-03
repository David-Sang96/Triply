import { verifyToken } from "@clerk/backend";

// Verifies the Clerk session token the app sends as `Authorization: Bearer
// <token>` (from `getToken()`), and returns the Clerk user id. Web-standard
// (uses fetch + WebCrypto), so it runs on Cloudflare Workers. Returns null when
// the header is missing or the token is invalid — callers respond 401.
// Comma-separated allowlist of origins Clerk tokens may be minted for (Clerk's
// `authorizedParties`) — rejects tokens from any other Clerk-connected frontend
// sharing this instance. Optional in local dev, required in production, where
// an unset value would silently disable the check for browser callers.
//
// It only applies to tokens that actually carry an `azp` claim. Clerk fills
// that claim from the browser origin that minted the session, so a native
// client — which has no origin — produces a token without it, and
// `verifyToken` REJECTS a missing claim rather than skipping the check.
// Applied unconditionally it 401s every request from the app:
//
//   Invalid JWT Authorized party claim (azp) undefined.
//
// So the check runs for browser-minted tokens, where it works as intended, and
// is skipped for native ones, where there is nothing to compare. Listing the
// `triply://` scheme does not help — that is never what `azp` holds.
const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES?.split(",")
  .map((p) => p.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production" && !authorizedParties?.length) {
  throw new Error(
    "CLERK_AUTHORIZED_PARTIES is not set. Required in production — set it to " +
      "this deployment's real origin(s)/app scheme(s) (see .env.example).",
  );
}

export async function getUserId(request: Request): Promise<string | null> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY is not set");
    return null;
  }

  // See the note on `authorizedParties` above. The check is applied only when
  // the token actually carries an `azp` claim, decided by reading the claim
  // itself rather than by guessing from a request header — an earlier attempt
  // keyed off `Origin` on the assumption that native clients never send one,
  // which is not something this code can rely on.
  //
  // Reading an unverified claim to decide *whether* to apply a stricter check
  // is safe. The token is signed: an attacker cannot strip `azp` to dodge the
  // check, because doing so invalidates the signature that verifyToken is
  // about to test. And when `azp` is genuinely absent there is nothing the
  // check could have compared anyway.
  const applyParties = Boolean(authorizedParties?.length) && hasAzpClaim(token);

  try {
    const payload = await verifyToken(token, {
      secretKey,
      ...(applyParties ? { authorizedParties } : {}),
    });
    return payload.sub ?? null;
  } catch (err) {
    console.error(
      `Clerk token verification failed (azp check ${applyParties ? "applied" : "skipped"}):`,
      err,
    );
    return null;
  }
}

// True when the JWT payload carries a non-empty `azp` claim. Decodes without
// verifying — see the caller for why that is safe here. Any malformed token
// returns false and falls through to verifyToken, which rejects it properly.
function hasAzpClaim(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;

  try {
    // JWTs use base64url; atob expects standard base64. Padding is optional in
    // base64url and required by atob.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as { azp?: unknown };
    return typeof claims.azp === "string" && claims.azp.length > 0;
  } catch {
    return false;
  }
}

// 401 response helper for unauthenticated API requests.
export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
