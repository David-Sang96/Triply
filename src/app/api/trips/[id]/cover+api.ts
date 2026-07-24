import { and, eq } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { trips } from "@/server/db/schema";
import { deleteCoverImage, uploadCoverImage } from "@/server/imagekit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The client compresses to ~1600px JPEG before upload, so a legitimate photo
// is normally well under 1MB — this is just a generous upper bound against a
// buggy or malicious client, not a real-world size expectation.
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function notFound(): Response {
  return Response.json({ error: "Not found" }, { status: 404 });
}

// POST /trips/:id/cover — upload a custom cover photo. The Unsplash cover
// fields are left untouched so the user can switch back to them later.
export async function POST(request: Request, { id }: Record<string, string>) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) return notFound();

  const [existing] = await db
    .select({ customCoverImageFileId: trips.customCoverImageFileId })
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .limit(1);
  if (!existing) return notFound();

  const form = await request.formData();
  // React Native's global FormData type (write-only, no `.get`) shadows the
  // real one this route runs against on Cloudflare Workers — narrow through
  // the actual read-capable shape instead of reaching for `any`.
  const file = (
    form as unknown as { get(name: string): FormDataEntryValue | null }
  ).get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "Image is too large" }, { status: 400 });
  }

  let url: string;
  let fileId: string;
  try {
    ({ url, fileId } = await uploadCoverImage(file, id));
  } catch (err) {
    console.error("ImageKit upload failed:", err);
    return Response.json(
      { error: "Upload failed. Please try again." },
      { status: 502 },
    );
  }

  // Only delete the previous cover once the new one is confirmed saved — if
  // the trip vanished between the ownership check above and here (a narrow
  // delete-while-uploading race), or the update itself fails, clean up the
  // file we just uploaded instead, so we never leak the "winner".
  let updated;
  try {
    [updated] = await db
      .update(trips)
      .set({
        customCoverImageUrl: url,
        customCoverImageFileId: fileId,
        useCustomCover: true,
      })
      .where(and(eq(trips.id, id), eq(trips.userId, userId)))
      .returning({ id: trips.id });
  } catch (err) {
    console.error("Failed to save uploaded cover:", err);
    try {
      await deleteCoverImage(fileId);
    } catch (cleanupErr) {
      console.error("Failed to clean up orphaned upload:", cleanupErr);
    }
    return Response.json(
      { error: "Upload failed. Please try again." },
      { status: 502 },
    );
  }

  if (!updated) {
    try {
      await deleteCoverImage(fileId);
    } catch (cleanupErr) {
      console.error("Failed to clean up orphaned upload:", cleanupErr);
    }
    return notFound();
  }

  // Best-effort: the new cover is already saved above, so a failure to clean
  // up the old file (e.g. ImageKit briefly down) shouldn't fail the request.
  if (existing.customCoverImageFileId) {
    try {
      await deleteCoverImage(existing.customCoverImageFileId);
    } catch (err) {
      console.error("Failed to delete replaced cover from ImageKit:", err);
    }
  }

  return Response.json({ customCoverImageUrl: url, useCustomCover: true });
}

// PATCH /trips/:id/cover — switch between the custom photo and the original
// Unsplash cover, without re-uploading anything.
export async function PATCH(
  request: Request,
  { id }: Record<string, string>,
) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return Response.json(
      { error: "useCustomCover must be a boolean" },
      { status: 400 },
    );
  }
  const { useCustomCover } = body as { useCustomCover?: boolean };
  if (typeof useCustomCover !== "boolean") {
    return Response.json(
      { error: "useCustomCover must be a boolean" },
      { status: 400 },
    );
  }

  const [row] = await db
    .select({ customCoverImageUrl: trips.customCoverImageUrl })
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .limit(1);
  if (!row) return notFound();

  if (useCustomCover && !row.customCoverImageUrl) {
    return Response.json(
      { error: "No custom photo to switch to" },
      { status: 400 },
    );
  }

  await db
    .update(trips)
    .set({ useCustomCover })
    .where(and(eq(trips.id, id), eq(trips.userId, userId)));

  return Response.json({ useCustomCover });
}
