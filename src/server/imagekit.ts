// Uploads a trip cover photo to ImageKit via its plain REST API (fetch +
// FormData, HTTP Basic auth with the private key) instead of a Node-only SDK,
// so this runs on Cloudflare Workers. Returns the ImageKit-hosted URL.
export async function uploadCoverImage(
  file: File,
  tripId: string,
): Promise<string> {
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

  const data = (await res.json()) as { url: string };
  return data.url;
}
