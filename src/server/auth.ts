import { verifyToken } from "@clerk/backend";

// Verifies the Clerk session token the app sends as `Authorization: Bearer
// <token>` (from `getToken()`), and returns the Clerk user id. Web-standard
// (uses fetch + WebCrypto), so it runs on Cloudflare Workers. Returns null when
// the header is missing or the token is invalid — callers respond 401.
export async function getUserId(request: Request): Promise<string | null> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set");

  try {
    const payload = await verifyToken(token, { secretKey });
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
