// Public web pages that live outside the app, in `legal/` (a static site deployed
// to Cloudflare Workers). Kept in one place because the same URLs are needed by
// the sign-up screen, the Profile screen, and the Privacy Policy screen — and
// because moving to a custom domain should be a one-line change here.
//
// Google Play requires two of these to exist and be reachable: a privacy policy
// (also linked in the store listing) and a web page where a user can request
// account deletion without opening the app.
const SITE = "https://triply-legal.luainawl.workers.dev";

export const links = {
  privacy: `${SITE}/privacy`,
  terms: `${SITE}/terms`,
  support: `${SITE}/support`,
  deleteAccount: `${SITE}/delete-account`,
} as const;
