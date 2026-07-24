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
- Old custom photos ARE deleted from ImageKit when replaced or the trip is
  deleted — see the API route's replacement flow below and the resolved
  entry in Open Questions (single source of truth for that behavior).

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

`src/server/db/schema.ts`, `trips` table — three new columns, added via a
versioned migration (`npm run db:generate` then `npm run db:migrate`, run by
the developer, not by the agent):

- `customCoverImageUrl: text("custom_cover_image_url")` — nullable. The
  ImageKit-hosted URL of the user's uploaded photo. `null` until the user
  uploads one.
- `customCoverImageFileId: text("custom_cover_image_file_id")` — nullable.
  ImageKit's own file identifier for the row above, persisted alongside the
  URL because `deleteCoverImage()` needs the fileId (not the URL) to delete
  the file — used when a custom cover is replaced or its trip is deleted.
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
  2. Reject before uploading anything (DB left unchanged either way): not a
     `File` → 400 "Missing file"; MIME type not `image/*` → 400 "File must
     be an image"; size over 8MB → 400 "Image is too large" (the client
     compresses to ~1600px JPEG, so a legitimate photo is normally well
     under 1MB — this is a generous ceiling against a buggy/malicious
     client, not a real-world size expectation).
  3. Upload it to ImageKit: `POST https://upload.imagekit.io/api/v1/files/upload`,
     Basic auth `${IMAGEKIT_PRIVATE_KEY}:`, form fields `file`, `fileName`
     (e.g. `cover-${Date.now()}.jpg`), `folder: /triply/trips/${id}`,
     `useUniqueFileName: true`. On failure, return a 502 with an error
     message; do not touch the DB row.
  4. Set `customCoverImageUrl`/`customCoverImageFileId` to the upload result
     and `useCustomCover` to `true` in one DB update, using `.returning()`
     to confirm a row was actually updated.
     - If the update throws, or affects zero rows (e.g. the trip was
       deleted in the narrow window between the ownership check and here),
       delete the *just-uploaded* file from ImageKit best-effort — so a
       failed/no-op save never leaves an orphaned "winner" file with no DB
       row pointing at it — then return the DB failure (502) or not-found
       (404) respectively.
  5. Once the update is confirmed, delete the *previous*
     `customCoverImageFileId` (if any) from ImageKit best-effort — a
     failure here is only logged server-side, since the new cover is
     already saved and shown either way.
  6. Return the updated `{ customCoverImageUrl, useCustomCover }`.

- **`PATCH`** — body `{ useCustomCover: boolean }`.
  1. Reject a body that isn't valid JSON, isn't an object, or whose
     `useCustomCover` is missing/not a boolean, with 400
     `"useCustomCover must be a boolean"` (or `"Invalid JSON body"` for
     unparseable JSON).
  2. If setting `true` and `customCoverImageUrl` is still `null`, return 400
     (nothing to switch to).
  3. Otherwise update `useCustomCover` and return the updated value.

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

- ~~Old custom photos are not deleted from ImageKit when replaced by a newer
  upload.~~ **Resolved:** a new upload now deletes the previous
  `customCoverImageFileId` from ImageKit after the new one is saved, and
  deleting a trip deletes its custom cover too. Both are best-effort
  (logged server-side on failure, never surfaced to the user), since the
  primary action has already succeeded either way. See `customCoverImageFileId`
  in the schema and `deleteCoverImage()` in `src/server/imagekit.ts`.
- ~~The Home/Trips list screens are untouched and keep showing the trip's
  original Unsplash cover even after a custom cover is set.~~ **Resolved:**
  extended to match the detail screen. `GET /api/trips` now selects
  `customCoverImageUrl`/`useCustomCover`, `TripListItem` carries them, and
  `UserTripCard` picks the active cover the same way (with the same ImageKit
  `?tr=w-480,q-70` transform for a smaller thumbnail). `useUploadTripCover`/
  `useToggleTripCover` invalidate the `["trips"]` list query too, alongside
  `["trip", id]`, so cards refresh immediately after either mutation.
