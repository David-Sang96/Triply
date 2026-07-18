import { verifyWebhook } from "@clerk/backend/webhooks";

import { inngest } from "@/server/inngest/client";

// Clerk webhook receiver. Verifies the Standard Webhooks signature (using
// CLERK_WEBHOOK_SIGNING_SECRET from the environment) before trusting the body,
// then enqueues an Inngest event for the user lifecycle (created / updated /
// deleted). The actual DB write happens in the Inngest job, so this handler
// stays fast and Clerk gets a quick 200.
export async function POST(request: Request) {
  let evt;
  try {
    evt = await verifyWebhook(request);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  // created and updated carry the same user payload; the event name differs.
  if (evt.type === "user.created" || evt.type === "user.updated") {
    const u = evt.data;

    // Prefer the user's primary email; fall back to the first on file.
    const primaryEmail =
      u.email_addresses.find((e) => e.id === u.primary_email_address_id)
        ?.email_address ?? u.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      // Nothing to store without an email; ack so Clerk stops retrying.
      return Response.json({ ok: true, skipped: "no-email" });
    }

    const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || null;

    await inngest.send({
      name:
        evt.type === "user.created" ? "clerk/user.created" : "clerk/user.updated",
      data: {
        id: u.id,
        email: primaryEmail,
        name,
        imageUrl: u.image_url || null,
      },
    });
  } else if (evt.type === "user.deleted") {
    // The deleted payload only carries the id (and it is optional).
    if (evt.data.id) {
      await inngest.send({
        name: "clerk/user.deleted",
        data: { id: evt.data.id },
      });
    }
  }

  return Response.json({ ok: true });
}
