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
    privacy.html          Privacy Policy
    terms.html            Terms of Service
    support.html          support page: contact address + common questions
    404.html              not-found page
    styles.css            all styling for every page
    favicon.svg
    assets/               phone screenshots used on the landing page
  REVIEWER-NOTES.md       what the two legal drafts assume, and the evidence
                          in src/ behind each claim. Not published
  tools/
    prepare-images.cjs    regenerates public/assets from the raw screenshots
  ui-inspiration.png      the design this page was measured against
  auth.png trips.png assistant.png profile.png trip-gen.png
                          raw app screenshots (sources for tools/prepare-images.cjs)
```

## Preview locally

Any static file server works, and so does VS Code Live Server or opening the
files directly. Every path in the HTML is **relative**, so the pages do not care
what the server root is:

```bash
cd legal/public
python -m http.server 8099        # http://127.0.0.1:8099/
```

Live Server from the repo root also works — `http://127.0.0.1:5500/legal/public/index.html`
finds the CSS and images fine. Keep the paths relative when editing: switching
back to root-absolute ones (`/styles.css`) breaks every preview whose root is not
`legal/public`.

On Cloudflare the pages are also reachable at the clean URLs `/privacy`, `/terms`,
and `/support` — use those for the App Store and Play Console listings. To preview
exactly that, including the 404 page:

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

- **Finish the two legal documents.** `privacy.html` and `terms.html` are drafted
  from what the code actually does, but every `[PLACEHOLDER]` needs a real value
  and both need a lawyer's review. `REVIEWER-NOTES.md` lists each placeholder,
  every assumption made, and the file and line in `src/` that backs each claim.
  Both pages carry a visible "not yet reviewed by a lawyer" banner until then.
- **Replace the testimonials.** The three quotes on the landing page are
  placeholder copy carried over from the design mock. Invented reviews cannot be
  published as real testimonials.
- **Use the official store badges.** The App Store and Google Play buttons are
  hand-drawn stand-ins. Apple and Google both require their own badge artwork.
- **Fill in the store links.** Every store button is `href="#"` until the app is
  published.
- **Retake the screenshots without the debug button.** The floating grey gear
  (the dev settings button) is visible in the current app screenshots.

Contact addresses are settled: `privacy@triply.app` and `support@triply.app`,
matching `src/app/privacy-policy.tsx` and `src/app/help-center.tsx`.
