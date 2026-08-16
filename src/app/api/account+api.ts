import { createClerkClient } from "@clerk/backend";

import { getUserId, unauthorized } from "@/server/auth";
import { captureServerError } from "@/server/sentry";

// DELETE /account — permanently delete the signed-in user's account.
//
// This route deletes the **Clerk** user and nothing else. Clerk then fires a
// `user.deleted` webhook, which /api/webhooks/clerk turns into the
// `clerk/user.deleted` Inngest event, and `syncUserDeleted` erases the database
// rows plus any uploaded cover images.
//
// That order matters: Clerk is the source of truth for the account, so it goes
// first. Deleting our rows first would leave a signed-in account with no data
// if the Clerk call then failed. Routing the data removal through the webhook
// also means an account deleted from the Clerk dashboard is cleaned up exactly
// the same way.
//
// The id comes from the verified session token, never from the request, so a
// caller can only ever delete their own account.
export async function DELETE(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY is not set");
    // Not an exception, but a deployment-wide breakage: account deletion is
    // impossible for every user until someone sets the variable. Reported as a
    // synthetic Error so it groups in Sentry like any other failure.
    await captureServerError(new Error("CLERK_SECRET_KEY is not set"), {
      failure_kind: "server_misconfigured",
      route: "DELETE /api/account",
      status: 500,
    });
    return Response.json(
      { error: "Account deletion is unavailable right now." },
      { status: 500 },
    );
  }

  try {
    await createClerkClient({ secretKey }).users.deleteUser(userId);
  } catch (err) {
    // Already gone — a retried request, or the account was removed from the
    // dashboard in the meantime. The caller's desired end state holds, so this
    // is a success rather than an error they can do nothing about.
    if (isNotFound(err)) {
      return Response.json({ ok: true, alreadyDeleted: true });
    }
    console.error("Clerk user deletion failed:", err);
    // A deletion that keeps failing is a data-protection problem, not just a
    // bad user experience — the privacy policy promises accounts can be
    // removed.
    await captureServerError(err, {
      failure_kind: "account_deletion_failed",
      route: "DELETE /api/account",
      status: 502,
      tags: { user_id: userId },
    });
    return Response.json(
      { error: "We couldn't delete your account. Please try again." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}

// Clerk's backend errors carry the HTTP status; anything else is unexpected.
function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status?: unknown }).status === 404
  );
}
