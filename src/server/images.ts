// Cover images via Unsplash (free, card-free). The image is of the destination
// city, not the exact place — a deliberate trade-off documented in the plan.
//
// Unsplash's API terms require two things we honor here:
//  1. Hotlink their CDN URL directly — never re-host/cache the image bytes.
//  2. Attribution: credit the photographer and link back to Unsplash (both
//     tagged with utm params). See getCoverImageUrl's return shape and
//     TripDetailView, which renders the credit line.
// We also ping the required "download" tracking endpoint once per use.
import { captureServerError } from "@/server/sentry";

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

      // Required download-tracking ping, for EVERY photo kept — not just the
      // cover. Unsplash's production checklist words it as "when a user in your
      // application uses a photo, it triggers an event to the download
      // endpoint", and every photo here is displayed in the trip's carousel, so
      // every one counts as used.
      //
      // It used to fire only for the first photo, to stay inside the Demo
      // tier's 50 requests/hour. That saved quota by under-reporting usage the
      // guidelines require reporting — and the production application asks you
      // to confirm compliance with exactly this point, so the trade was not
      // ours to make.
      //
      // Fire and forget: these pings are attribution bookkeeping, and a failed
      // one must not delay or fail a generation.
      //
      // They DO count against the rate limit, so this makes the Demo tier
      // meaningfully tighter: at `count = 5` a generation costs 1 search + 5
      // pings = 6 requests instead of 2, which is roughly 8 generations per hour
      // within the 50/hour Demo cap rather than 25. (More if the search falls
      // through to a second or third term.) That is the correct trade — being
      // inside the guidelines is not optional — and production access lifts the
      // cap to 1,000/hour, at which point the arithmetic stops mattering.
      if (photo.links?.download_location) {
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
    // Worth reporting even though generation continues without a cover: the
    // Unsplash account is still on the Demo tier (50 requests/hour), so this is
    // how the rate limit being hit in real use becomes visible instead of just
    // producing trips with no photo. See the production-access item in PLAN.md.
    await captureServerError(err, {
      failure_kind: "unsplash_search_failed",
      route: "getDestinationImages",
    });
    return [];
  }
}
