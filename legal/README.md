# Triply — landing & legal site

A small static site: the marketing landing page plus the Privacy Policy and
Terms of Service pages that the app stores require. It is **plain HTML and CSS
only** — no framework, no build step, no JavaScript, and no requests to any
other server. Everything the browser needs is in `public/`.

This is deliberately separate from the mobile app in `src/`. It deploys on its
own and shares nothing with the Expo project.

## Layout

```
legal/
  wrangler.jsonc          Cloudflare Workers config (assets-only, no Worker script)
  public/                 <- everything in here is what gets served
    index.html            landing page
    privacy.html          Privacy Policy (shell — text still to be written)
    terms.html            Terms of Service (shell — text still to be written)
    404.html              not-found page
    styles.css            all styling for every page
    favicon.svg
    assets/               phone screenshots used on the landing page
  tools/
    prepare-images.cjs    regenerates public/assets from the raw screenshots
  ui-inspiration.png      the design this page was measured against
  auth.png trips.png assistant.png profile.png trip-gen.png
                          raw app screenshots (sources for tools/prepare-images.cjs)
```

## Preview locally

Any static file server works. It must be served over HTTP, not opened as a
`file://` path, because the pages link to `/styles.css` from the site root.

```bash
cd legal/public
python -m http.server 8099        # then open http://127.0.0.1:8099/
```

With a plain file server the footer links (`/privacy`, `/terms`) will 404 — those
extensionless URLs are resolved by Cloudflare, not by the server. Open
`/privacy.html` directly, or use the command below instead.

To preview exactly how Cloudflare will serve it (clean URLs, the 404 page):

```bash
cd legal
npx wrangler dev
```

## Deploy to Cloudflare Workers

Free: static assets are unmetered on the Workers free plan, and no Worker script
runs, so there is nothing to bill per request.

```bash
cd legal
npx wrangler login      # once, opens a browser
npx wrangler deploy
```

That publishes to `https://triply-legal.<your-subdomain>.workers.dev`. To use a
real domain instead, add the route in the Cloudflare dashboard under
**Workers & Pages → triply-legal → Settings → Domains & Routes**.

`npx` downloads Wrangler on demand, so nothing is installed into this repo —
that keeps a second `node_modules` out of the Expo project, where Metro would
otherwise crawl it.

## Regenerating the phone images

`public/assets/*.png` are the raw app screenshots with their flat `#f8f9fa`
backdrop removed, so the phones can sit on any page colour. The script
flood-fills inward from the border, which is why the white inside each phone
screen survives, and recovers the drop shadow as soft alpha.

```bash
node legal/tools/prepare-images.cjs      # run from the repo root; uses the jimp devDependency
```

Replace `auth.png` / `trips.png` / `assistant.png` and re-run to refresh them.

## Before this goes live

- **Write the two legal documents.** `privacy.html` and `terms.html` are
  finished shells with a styled `.prose` block and a visible placeholder note.
- **Replace the testimonials.** The three quotes on the landing page are
  placeholder copy carried over from the design mock. Invented reviews cannot be
  published as real testimonials.
- **Use the official store badges.** The App Store and Google Play buttons are
  hand-drawn stand-ins. Apple and Google both require their own badge artwork.
- **Fill in the store links.** Every store button is `href="#"` until the app is
  published.
- **Confirm the contact address and domain.** `support@triply.com` also comes
  from the mock.
- **Retake the screenshots without the debug button.** The floating grey gear
  (the dev settings button) is visible in the current app screenshots.
