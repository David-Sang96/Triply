# Multi-language support — English + Burmese

**Status:** design agreed 24 Aug 2026, not yet implemented.
**Goal:** the whole app in English or Burmese, switched from Profile →
Preferences, applying instantly — no restart, no reload.

Implementation checklist lives in `PLAN.md` once this is approved.

---

## Where the app is today

There is no i18n of any kind: no `i18next`, no `expo-localization`, no
`Intl`-based formatting. Every string is a hardcoded English literal in JSX.
The one locale-aware call in the app is `new Date(iso).toLocaleDateString()` in
`src/app/(tabs)/assistant.tsx`, which follows the device by accident rather
than design.

There **is** a Language row on the Profile screen offering five options
(English, Español, Français, Deutsch, 日本語), persisted to SecureStore by
`src/lib/preferences.ts`. Nothing consumes it. `usePreferences` is imported by
exactly one file — `profile.tsx` — so choosing 日本語 changes that row's own
label and nothing else. The same is true of `currency` and `budget`.

Two consequences worth naming, because they are pre-existing bugs this work
has to walk past or fix:

- `src/app/help-center.tsx` tells users that language, currency and budget
  "are used as the starting point for new trips". They are not. `generate.tsx`
  never reads preferences, and imports its own duplicate `BUDGETS` constant
  from `@/data/generate`.
- `src/app/privacy-policy.tsx` says those preferences stay on the device. That
  one is true, and this design keeps it true.

## Decisions

Four decisions were taken before designing. Each records what was rejected,
because the rejected options are the ones that look attractive later.

### 1. AI-generated content follows the language going forward; existing trips do not change

A trip generated while Burmese is selected comes back in Burmese. A trip
generated earlier keeps the language it was made in. Switching language does
not retranslate anything.

*Rejected:* retranslating existing trips on switch — a Gemini call per trip per
toggle, latency on a settings tap, and a risk of mangling verified place names.
*Rejected:* UI-only translation — a Burmese shell around English itineraries is
the shell translated and the product not.

### 2. Place names stay in their original script

Prose — descriptions, tips, day summaries — is translated. The `name` field of
each place is not: it stays "Shwezigon Pagoda".

This is not an aesthetic choice. The server geocodes each activity's location
string with Photon and drops a map pin from the result. Burmese-script names
would mostly fail to geocode, so trips would lose their pins and
`place_verified` would go false — regressing the map feature shipped on 22 Aug.
It also keeps the name useful in the real world: readable on a sign, showable
to a taxi driver.

*Rejected:* "Burmese (English)" combined names — nicer to read, but the
geocoder then needs a separate clean field, which means splitting `name` into
display and geocode columns across the schema, the AI response schema and every
existing row.

### 3. Scope for v1: app UI chrome and server failure messages

**In:** all 16 screens — every button, label, tab, empty state, form field,
alert and validation message. Plus the server-written failure text, which
currently reaches the user as English prose at the worst possible moment.

**Out, deliberately:** the in-app legal and help screens
(`privacy-policy.tsx`, `help-center.tsx`, `about.tsx`, support) and the six
hosted pages in `legal/`. Play requires a privacy-policy URL, not one per
language, so this does not block store submission. The gap is real and visible
— a Burmese user tapping Help gets English — and is accepted for v1 rather than
overlooked.

*Note:* if `help-center.tsx` is translated later, its false claim about
preferences seeding new trips must be fixed rather than translated.

### 4. `i18next` + `react-i18next`

The standard choice for production React Native apps, and the reason to prefer
it is that it is standard: a developer joining this project already knows it,
and plurals, interpolation and fallback chains come for free rather than being
ours to maintain.

*Rejected:* a hand-rolled ~150-line typed module. It would give compile-time
key safety by construction and add no dependency — which matters here, see
"Deployment consequences" — but "we invented our own i18n" is a cost paid
forever, and the dependency's real cost is a one-time rebuild that the Play
closed test forces anyway.

*Rejected:* `i18n-js`, where a wrong key returns a "missing translation" string
at runtime instead of failing the build.

An earlier draft of this decision leaned on "Hermes has patchy `Intl` support"
as an argument against `i18next`. That was overstated. `i18next`'s JSON v4
format does use `Intl.PluralRules`, and the documented escape hatch is one
config line, `compatibilityJSON: 'v3'`, which this design sets. Burmese has no
grammatical plural, so the setting only affects English's one/other forms.

---

## Architecture

### The translation layer

`src/lib/i18n/index.ts` initialises i18next once. Two catalogs, `en.ts` and
`my.ts`, one namespace, dotted keys grouped by screen (`home.empty.title`,
`generate.submit`). Language codes are `en` and `my` — codes, not display
names, so the stored value never needs re-parsing.

Type safety comes from declaration merging in `src/types/react-i18next.d.ts`
pointing `resources` at the `en` catalog. A missing or mistyped key then fails
`npx tsc --noEmit`. This matters more here than in most projects: `tsc` and
`lint` are the *only* automated gate, so anything they cannot catch is caught
by a human or not at all.

### The font — the load-bearing part

Every `Text` in the app takes its family from a NativeWind class:
`font-sans`, `font-pmedium`, `font-psemibold`, `font-pbold`, defined as
`@theme` tokens in `global.css` and pointing at Poppins. There are **177 such
classes across 33 files**, and no shared `Text` wrapper.

**Poppins contains no Myanmar glyphs.** Burmese would render as tofu boxes, or
fall back to whatever Myanmar font the device has — and on Myanmar Android
phones that is often a *Zawgyi*-encoded font, which renders Unicode Burmese as
garbage. Bundling our own font is what makes the app immune to that, and is the
reason not to rely on system fallback.

So: bundle **Noto Sans Myanmar** at weights 400/500/600/700, matching Poppins
one for one, via `@expo-google-fonts/noto-sans-myanmar` (v0.4.2 — confirmed to
exist on npm, and the same family of package as the Poppins one already used).
A package rather than raw `.ttf` files in `assets/`: the fingerprint is
changing anyway because of `i18next`, so the one advantage of hand-bundling —
leaving `package.json` untouched — buys nothing here.

At the app root, one `View` overrides the theme tokens at runtime:

```tsx
style={vars({
  "--font-sans":      isMy ? "NotoSansMyanmar_400Regular" : "Poppins_400Regular",
  "--font-pmedium":   isMy ? "NotoSansMyanmar_500Medium"  : "Poppins_500Medium",
  "--font-psemibold": isMy ? "NotoSansMyanmar_600SemiBold": "Poppins_600SemiBold",
  "--font-pbold":     isMy ? "NotoSansMyanmar_700Bold"    : "Poppins_700Bold",
})}
```

NativeWind's `vars()` follows standard CSS variable inheritance, so all 177
classes pick up the new family **with no edit to those 33 files**.

This is the single assumption the design rests on, so it is verified first —
see Build order step 1. If NativeWind v5 turns out to bake the token in at
build time rather than emitting `var(--font-sans)`, the fallback is a shared
`<AppText>` wrapper plus a mechanical sweep of all 177 sites. That is a much
larger job, and it must be discovered on day one rather than after 16 screens
have been translated.

Burmese stacked glyphs also need more line height than Latin or they clip.
The amount is measured from a device screenshot, not guessed.

### Where the language lives

`usePreferences` is currently a hook with its own `useState`, so two callers
get two independent copies. That is invisible while `profile.tsx` is the only
caller and breaks the moment language is read app-wide. It is lifted to a
`PreferencesProvider` at the root — same `triply.preferences.v1` SecureStore
key, same `clearPreferences` on account deletion, so nothing new is stored and
nothing is sent to the server. The privacy policy's claim stays true.

First paint is handled by the gate that already exists: `_layout.tsx` holds the
native splash until `fontsLoaded`. The stored-language read joins that gate, so
Burmese is in place before the first frame — no flash of English.

`LANGUAGES` drops from five entries to two: English and မြန်မာ. Dead options
are removed rather than left to do nothing. Existing stored values for the
removed languages fall through the validation in `coerce()` to the default,
which already behaves correctly.

### AI content and server errors

One migration adds two nullable columns to `trips`: `language` and
`error_code`. Both are additive with no volatile default, so there is no table
rewrite.

- `POST /trips` accepts the language, stores it on the row, and `generateTrip`
  passes it to the Gemini prompt: write all prose in Burmese, leave each
  place's `name` in its original form.
- **Retry needs no work.** `POST /trips/:id/retry` already re-reads the
  generation parameters from the trip row, so a retried trip regenerates in the
  language it was created in.
- Chat sends the current language per request; replies follow from that point.
- `friendlyError` in `src/server/inngest/functions.ts` returns one of only two
  distinct strings today, and two more literals live in the API routes. These
  become three codes — `ai_rate_limited`, `generation_failed`,
  `enqueue_failed` — written to `error_code`. The app translates the code and
  falls back to the stored English `errorMessage` when `error_code` is null,
  which is every row that exists today. Old failed trips keep working untouched.

This also tightens telemetry: a code is exactly the "fixed category" that
`AGENTS.md` says may go to Sentry, where the current user-facing prose is not.

---

## Build order

Each step is verifiable on its own. Steps 1–3 change no user-visible behaviour,
so they can land incrementally.

1. **Font spike.** Bundle Noto Sans Myanmar, wrap the root in `vars()`,
   hardcode Burmese on one screen, screenshot with `adb`. Proves or kills the
   font approach before any string is extracted.
2. i18n scaffolding, `PreferencesProvider`, two-language picker. App still
   entirely English, everything wired.
3. String extraction, screen by screen — roughly 16 reviewable commits.
4. Migration, prompt threading, `friendlyError` → codes.
5. Fill the Burmese catalog.

## Verification

There is no test framework, so the gate is `npx tsc --noEmit`, `npm run lint`,
and screenshots of the running app via `adb screencap` — never restarting or
reloading it, since Metro fast-refresh applies edits on its own.

Per screen: switch language, screenshot, check for tofu boxes, clipped glyphs
and overflowing controls. **Burmese runs longer than English**, so layout
breakage in fixed-width chips and buttons is expected work, not a surprise.

The AI half needs one real Burmese generation on the device, confirming place
names came back Latin and the map still has its pins.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| `vars()` does not override theme tokens at runtime | Step 1 spike, before anything depends on it. Fallback is an `<AppText>` wrapper across 177 sites |
| Device carries a Zawgyi font and mangles Unicode Burmese | Bundling our own font makes the app immune; this is why system fallback is not used |
| Burmese overflows fixed-size UI | Screenshot sweep during step 3 |
| Gemini ignores "keep names in original script" | Verified on a real generation; if it drifts, require a Latin `name` in the response schema |

## Deployment consequences

Adding `i18next` changes `package.json`, which changes the Expo fingerprint —
and per `docs/RELEASE.md`, **that ends over-the-air delivery to every existing
install until a new build is cut.** The Play closed test needs a fresh build
anyway; the ordering is what matters. Build first, then updates flow again.

The migration is additive and nullable. Order is the project's standard one:
`db:generate` → `db:migrate` → `db:check` → `db:migrate:prod`. These are
developer-run commands; an agent must not run them.

## Out of scope for v1

Legal and help screens, the hosted `legal/` site, device-locale auto-detection,
right-to-left support, and syncing the language choice across devices.
