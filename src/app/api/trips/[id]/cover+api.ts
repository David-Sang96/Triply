import { and, eq } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { trips } from "@/server/db/schema";
import { uploadCoverImage } from "@/server/imagekit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .limit(1);
  if (!existing) return notFound();

  const form = await request.formData();
  const file = (form as any).get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  let url: string;
  try {
    url = await uploadCoverImage(file, id);
  } catch (err) {
    console.error("ImageKit upload failed:", err);
    return Response.json(
      { error: "Upload failed. Please try again." },
      { status: 502 },
    );
  }

  await db
    .update(trips)
    .set({ customCoverImageUrl: url, useCustomCover: true })
    .where(eq(trips.id, id));

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

  const body = (await request.json()) as { useCustomCover?: boolean };
  if (typeof body.useCustomCover !== "boolean") {
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

  if (body.useCustomCover && !row.customCoverImageUrl) {
    return Response.json(
      { error: "No custom photo to switch to" },
      { status: 400 },
    );
  }

  await db
    .update(trips)
    .set({ useCustomCover: body.useCustomCover })
    .where(eq(trips.id, id));

  return Response.json({ useCustomCover: body.useCustomCover });
}
