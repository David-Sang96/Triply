// Uploads a trip cover photo to ImageKit via its plain REST API (fetch +
// FormData, HTTP Basic auth with the private key) instead of a Node-only SDK,
// so this runs on Cloudflare Workers. Returns the ImageKit-hosted URL and the
// fileId (needed later to delete this exact file — see deleteCoverImage).
export async function uploadCoverImage(
  file: File,
  tripId: string,
): Promise<{ url: string; fileId: string }> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not set");

  const form = new FormData();
  form.append("file", file, file.name || "cover.jpg");
  form.append("fileName", `cover-${Date.now()}.jpg`);
  form.append("folder", `/triply/trips/${tripId}`);
  form.append("useUniqueFileName", "true");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${privateKey}:`)}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`ImageKit upload failed (${res.status})`);
  }

  const data = (await res.json()) as { url: string; fileId: string };
  return { url: data.url, fileId: data.fileId };
}

// Deletes a previously uploaded cover photo from ImageKit by its fileId.
// Callers treat this as best-effort cleanup (an old/orphaned custom cover
// replaced or a deleted trip) — a failure here shouldn't block the request
// that triggered it, so this just throws and lets the caller decide.
export async function deleteCoverImage(fileId: string): Promise<void> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not set");

  const res = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${btoa(`${privateKey}:`)}` },
  });

  if (!res.ok) {
    throw new Error(`ImageKit delete failed (${res.status})`);
  }
}
