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
// It only applies to requests that carry an `Origin` header. Clerk fills the
// token's `azp` claim from the browser origin that minted the session, so a
// native client — which has no origin — produces a token with no `azp` at all,
// and `verifyToken` REJECTS a missing claim rather than skipping the check.
// Applied unconditionally it 401s every request from the app:
//
//   Invalid JWT Authorized party claim (azp) undefined.
//
// Gating on `Origin` keeps the protection where it can actually work (browsers
// always send `Origin` cross-origin, and those tokens do carry `azp`) and
// gives up nothing where it never could: a token minted by another *native*
// frontend of this instance would have no `azp` to check either way.
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

  // See the note on `authorizedParties` above — only browser callers can be
  // checked, and they are exactly the ones that send `Origin`.
  const isBrowserRequest = Boolean(request.headers.get("Origin"));

  try {
    const payload = await verifyToken(token, {
      secretKey,
      ...(isBrowserRequest && authorizedParties?.length
        ? { authorizedParties }
        : {}),
    });
    return payload.sub ?? null;
  } catch (err) {
    console.error("Clerk token verification failed:", err);
    return null;
  }
}

// 401 response helper for unauthenticated API requests.
export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
