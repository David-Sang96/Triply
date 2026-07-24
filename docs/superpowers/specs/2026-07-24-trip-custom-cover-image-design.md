# Trip Custom Cover Image — Design

Date: 2026-07-24

## Purpose

On the trip detail screen (`src/components/trip/TripDetailView.tsx`), the cover
photo at the top is picked automatically from Unsplash when the trip is
generated. This feature lets the user replace it with their own photo from
their phone's gallery, and toggle back to the original Unsplash photo at any
time without losing it.

## Scope

- Replaces only the hero/cover image on the trip detail screen.
- Does **not** touch the photo carousel (`trips.images`) below the hero —
  that stays as the original Unsplash set.
- Does **not** delete old custom photos from ImageKit when replaced again
  (out of scope for this version — see Open Questions).

## Upload architecture

**Chosen approach: upload through our own server (not direct-to-ImageKit).**

The phone sends the (already-compressed) photo to our own API route. That
route uploads it to ImageKit using the private key, then saves the resulting
URL. This was chosen over a direct-to-ImageKit client upload (which would need
a signed-token round trip first) because:

- It keeps `IMAGEKIT_PRIVATE_KEY` server-side only, which is required anyway.
- It matches the existing API route pattern in this codebase (auth check +
  DB update in one request — see `src/app/api/trips/[id]+api.ts`).
- The app is small-scale today; the extra round trip of a direct-upload
  scheme isn't worth the added complexity yet.

ImageKit's plain REST upload endpoint
(`POST https://upload.imagekit.io/api/v1/files/upload`, multipart form data,
HTTP Basic auth with the private key) is used directly via `fetch` —
no Node-only SDK, so it works on Cloudflare Workers.

## Data model

`src/server/db/schema.ts`, `trips` table — two new columns, added via a
versioned migration (`npm run db:generate` then `npm run db:migrate`, run by
the developer, not by the agent):

- `customCoverImageUrl: text("custom_cover_image_url")` — nullable. The
  ImageKit-hosted URL of the user's uploaded photo. `null` until the user
  uploads one.
- `useCustomCover: boolean("use_custom_cover").notNull().default(false)` —
  which cover is currently shown. `true` = show `customCoverImageUrl`,
  `false` = show the original `coverImageUrl` (and its Unsplash attribution).

The existing `coverImageUrl`, `coverImagePhotographerName`,
`coverImagePhotographerUrl`, `coverImageUnsplashUrl` columns are untouched.

## API route

New file: `src/app/api/trips/[id]/cover+api.ts` (matches the existing nested
route pattern used by `src/app/api/trips/[id]/status+api.ts`).

Both handlers: verify the Clerk-authenticated user owns the trip (same
`getUserId` + ownership-scoped Drizzle query pattern as the other trip
routes), and validate `id` against the existing UUID regex.

- **`POST`** — body is `multipart/form-data` with a `file` field (the
  compressed photo).
  1. Read the file from the form data.
  2. Upload it to ImageKit: `POST https://upload.imagekit.io/api/v1/files/upload`,
     Basic auth `${IMAGEKIT_PRIVATE_KEY}:`, form fields `file`, `fileName`
     (e.g. `cover-${Date.now()}.jpg`), `folder: /triply/trips/${id}`,
     `useUniqueFileName: true`.
  3. On success, set `customCoverImageUrl` to the returned `url` and
     `useCustomCover` to `true` in one DB update.
  4. Return the updated `{ customCoverImageUrl, useCustomCover }`.
  5. On ImageKit failure, return a 502 with an error message; do not touch
     the DB row.

- **`PATCH`** — body `{ useCustomCover: boolean }`.
  1. If setting `true` and `customCoverImageUrl` is still `null`, return 400
     (nothing to switch to).
  2. Otherwise update `useCustomCover` and return the updated value.

## Client changes

- **`src/lib/api.ts`** — `useApiFetch`'s `ApiInit` type gains a `formData?:
  FormData` option alongside the existing `json?: unknown` one. When
  `formData` is set, it's passed straight through as the request body and no
  `Content-Type` header is set (so `fetch` fills in the multipart boundary
  itself), mirroring how `json` already works.

- **`src/lib/trips.ts`**:
  - `TripDetail` type gains `customCoverImageUrl: string | null` and
    `useCustomCover: boolean`.
  - `useUploadTripCover(id)` — mutation, builds a `FormData` with the local
    file (`{ uri, name, type }`), `POST`s to `/api/trips/${id}/cover`,
    invalidates `["trip", id]` on success.
  - `useToggleTripCover(id)` — mutation, `PATCH`s
    `/api/trips/${id}/cover` with `{ useCustomCover }`, invalidates
    `["trip", id]` on success.

- **`src/components/trip/TripDetailView.tsx`**:
  - A new camera-icon button next to the existing delete button, same round
    `bg-black/40` style (`h-10 w-10 rounded-full`, `Ionicons`,
    `colors.surface`, `hitSlop={8}`). Icon: `camera-outline`.
  - On press: request media-library permission (`expo-image-picker`) → if
    denied, show an inline message and stop → open the gallery
    (`launchImageLibraryAsync`) → if the user cancels, do nothing → compress
    the picked photo on-device (`expo-image-manipulator`, resized to a
    reasonable max dimension, e.g. 1600px on the long edge, JPEG quality
    ~0.7) → call `useUploadTripCover`.
  - A second, smaller toggle button (icon: `swap-horizontal-outline`),
    shown only when `customCoverImageUrl` is not `null`. Tapping it calls
    `useToggleTripCover` with the opposite of the current `useCustomCover`.
  - The hero image's `source` is chosen by `useCustomCover`: the custom URL
    (with an ImageKit transform query string appended, e.g.
    `?tr=w-1200,q-70`, for optimized delivery) or the original
    `coverImageUrl` (unchanged, no transform — it's an Unsplash URL, not
    ImageKit's).
  - Attribution text/link (photographer name, Unsplash link) is only shown
    when `useCustomCover` is `false`, matching that it only applies to the
    original photo.

## New dependencies

- `expo-image-picker` — opens the gallery, handles permissions.
- `expo-image-manipulator` — resizes/compresses the photo on-device before
  upload, so large camera photos are never sent or stored at full size.

Both add native modules, so **a native rebuild is required after installing
them** (the developer runs this — the agent does not run builds, per this
project's rules). `expo-image-picker` also needs a config-plugin entry in
`app.json` (`plugins: [["expo-image-picker", { photosPermission: "..." }]]`)
for the iOS permission message.

## Error handling

- Permission denied → inline message, no crash, camera button stays usable
  (user can grant permission later and retry).
- User cancels the picker → no-op, nothing changes.
- Upload fails (network error or ImageKit error) → inline error shown,
  whichever cover was active before the attempt keeps showing.
- Toggle fails → inline error, UI stays on the previous state (no optimistic
  flip without confirmation, since it's a simple, low-frequency action).

## Open questions (deferred, not blocking this version)

- Old custom photos are not deleted from ImageKit when replaced by a newer
  upload. Storage cost is negligible at this app's current scale; can be
  revisited later (e.g. a cleanup job) if it becomes relevant.
- The Home/Trips list screens (`GET /api/trips`, `TripListItem`,
  `UserTripCard`) are untouched and keep showing the trip's original Unsplash
  cover even after a custom cover is set — confirmed as intentional: this
  feature is scoped to the trip detail screen only. Not a bug; revisit only
  if the list view is explicitly asked to reflect custom covers later.
