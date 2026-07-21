import { verifyToken } from "@clerk/backend";

// Verifies the Clerk session token the app sends as `Authorization: Bearer
// <token>` (from `getToken()`), and returns the Clerk user id. Web-standard
// (uses fetch + WebCrypto), so it runs on Cloudflare Workers. Returns null when
// the header is missing or the token is invalid — callers respond 401.
// Comma-separated allowlist of origins/app schemes Clerk tokens may be minted
// for (Clerk's `authorizedParties`) — rejects tokens from any other
// Clerk-connected frontend sharing this instance. Optional: unset preserves
// today's behavior (no origin restriction) until the app's real origin(s) are
// known and added to .env.
const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES?.split(",")
  .map((p) => p.trim())
  .filter(Boolean);

export async function getUserId(request: Request): Promise<string | null> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY is not set");
    return null;
  }

  try {
    const payload = await verifyToken(token, {
      secretKey,
      ...(authorizedParties?.length ? { authorizedParties } : {}),
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
