// Cover images via Unsplash (free, card-free). The image is of the destination
// city, not the exact place — a deliberate trade-off documented in the plan.
//
// Unsplash's API terms require two things we honor here:
//  1. Hotlink their CDN URL directly — never re-host/cache the image bytes.
//  2. Attribution: credit the photographer and link back to Unsplash (both
//     tagged with utm params). See getCoverImageUrl's return shape and
//     TripDetailView, which renders the credit line.
// We also ping the required "download" tracking endpoint once per use.
const APP_NAME = "Triply";

export type CoverImage = {
  url: string;
  photographerName: string;
  photographerUrl: string;
  unsplashUrl: string;
};

function withUtm(url: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", APP_NAME);
  u.searchParams.set("utm_medium", "referral");
  return u.toString();
}

// Search terms to try, in order, stopping at the first that returns anything.
//
// Users type destinations freely, and an exact phrase often matches no photo
// at all: "Malaysia Genting high land travel" returned nothing and the trip was
// saved with no cover. Each step drops something — first the "travel" keyword,
// then everything but the broadest part of the name (the text after the last
// comma, which is usually the country, otherwise the final word).
//
// Deliberately stops at the region rather than falling back to a generic
// travel photo: a wrong-place cover is worse than none, and the UI now shows a
// placeholder when there is no image.
function searchTerms(destination: string): string[] {
  const trimmed = destination.trim();
  const terms = [`${trimmed} travel`, trimmed];

  const parts = trimmed.split(",");
  const broadest = (
    parts.length > 1 ? parts[parts.length - 1] : trimmed.split(/\s+/).pop()
  )?.trim();

  if (broadest && broadest.toLowerCase() !== trimmed.toLowerCase()) {
    terms.push(broadest);
  }
  return terms;
}

// Returns up to `count` landscape destination photos (each with required
// attribution) for the detail carousel. The first is used as the cover. Returns
// an empty array if no key is configured or every search fails — never throws.
export async function getDestinationImages(
  destination: string,
  count = 5,
): Promise<CoverImage[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn(
      "UNSPLASH_ACCESS_KEY not set — skipping cover images for this trip.",
    );
    return [];
  }

  for (const term of searchTerms(destination)) {
    const images = await searchPhotos(term, count, accessKey);
    if (images.length > 0) return images;
  }
  return [];
}

async function searchPhotos(
  query: string,
  count: number,
  accessKey: string,
): Promise<CoverImage[]> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("per_page", String(count));

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      results?: {
        id: string;
        urls?: { regular?: string; full?: string };
        user?: { name?: string; links?: { html?: string } };
        links?: { html?: string; download_location?: string };
      }[];
    };

    const images: CoverImage[] = [];
    for (const photo of data.results ?? []) {
      const imageUrl = photo.urls?.regular ?? photo.urls?.full;
      if (!imageUrl) continue;

      // Required download-tracking ping — only for the cover (first) photo, to
      // stay well within Unsplash's free-tier request budget. Fire and forget.
      if (images.length === 0 && photo.links?.download_location) {
        fetch(photo.links.download_location, {
          headers: { Authorization: `Client-ID ${accessKey}` },
        }).catch(() => {});
      }

      images.push({
        url: imageUrl,
        photographerName: photo.user?.name ?? "Unsplash",
        photographerUrl: withUtm(
          photo.user?.links?.html ?? "https://unsplash.com",
        ),
        unsplashUrl: withUtm(photo.links?.html ?? "https://unsplash.com"),
      });
    }
    return images;
  } catch (err) {
    console.error("Unsplash search failed:", err);
    return [];
  }
}
