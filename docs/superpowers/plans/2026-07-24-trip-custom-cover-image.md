# Trip Custom Cover Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user replace a trip's Unsplash cover photo with one from their own gallery, uploaded through ImageKit, with a toggle to switch back to the original.

**Architecture:** A new nested API route (`src/app/api/trips/[id]/cover+api.ts`) uploads the photo to ImageKit server-side (private key never leaves the server) and flips a `useCustomCover` flag on the trip row. The client picks and compresses the photo on-device, then calls this route. The trip screen's hero section switches between the existing Unsplash photo carousel and a single static custom photo based on that flag.

**Tech Stack:** Expo SDK 57 · Expo Router API routes (Cloudflare Workers) · Drizzle ORM/Postgres · `expo-image-picker` · `expo-image-manipulator` · ImageKit REST upload API · TanStack Query.

**Testing note:** This project has no automated test framework configured (see `CLAUDE.md`). Steps below use TypeScript compilation (`npx tsc --noEmit`) and `npm run lint` as the automated check after each code change, plus a manual, on-device verification checklist at the end (Task 8) instead of automated tests.

**Rules this plan must respect (from `AGENTS.md`):**
- The agent never runs the dev server, native builds, or `db:generate`/`db:migrate`/`db:push` — those steps are explicitly flagged below as **developer-run**.
- Server code uses only web-standard APIs (`fetch`, `FormData`, `btoa`, `crypto`) — no Node built-ins. All server code in this plan follows that.
- Styling uses NativeWind `className`, not `StyleSheet`.

---

## Task 1: Schema — add cover-override columns

**Files:**
- Modify: `src/server/db/schema.ts:80-85`

- [ ] **Step 1: Add the new columns**

In the `trips` table definition, right after the existing `coverImageUnsplashUrl` line, add:

```ts
    // A user-uploaded photo (via ImageKit) that can replace the Unsplash cover
    // above. useCustomCover picks which one is shown; the Unsplash fields
    // above are kept untouched so the user can switch back to them.
    customCoverImageUrl: text("custom_cover_image_url"),
    // ImageKit's fileId for the row above — needed to delete the file from
    // ImageKit when it's replaced by a new upload or the trip is deleted.
    customCoverImageFileId: text("custom_cover_image_file_id"),
    useCustomCover: boolean("use_custom_cover").notNull().default(false),
```

(`boolean` is already imported in this file — it's used by `countsAgainstCap` a few lines down.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema.ts
git commit -m "feat: add custom cover image columns to trips table"
```

- [ ] **Step 4: STOP — ask the developer to run the migration**

Tell the developer to run, in their own terminal (per `AGENTS.md`, the agent must not run these):

```bash
npm run db:generate
npm run db:migrate
```

Do not proceed to Task 4 (the API route) being tested end-to-end until they confirm this is done — the code will still compile without it, but `customCoverImageUrl`/`useCustomCover` won't exist in the real database until the migration runs.

---

## Task 2: Install new packages

**Files:**
- Modify: `package.json`
- Modify: `app.json`

- [ ] **Step 1: Install the packages**

Run: `npx expo install expo-image-picker expo-image-manipulator`
Expected: `package.json` gains `expo-image-picker` and `expo-image-manipulator` entries at versions matched to Expo SDK 57.

- [ ] **Step 2: Add the image-picker config plugin**

In `app.json`, add an entry to the `"plugins"` array (after `"expo-secure-store"`):

```json
      "@clerk/expo",
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Triply to access your photos so you can set a custom trip cover."
        }
      ]
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "feat: add expo-image-picker and expo-image-manipulator"
```

- [ ] **Step 4: STOP — flag the native rebuild requirement**

Tell the developer: these are new native modules, so the dev client needs a fresh native rebuild (`npm run android`, developer-run) before the camera button will work. Nothing in Tasks 3-7 requires the rebuild to compile, but the feature can't be tested on-device until it happens.

---

## Task 3: ImageKit upload helper

**Files:**
- Create: `src/server/imagekit.ts`

- [ ] **Step 1: Write the helper**

```ts
// Uploads a trip cover photo to ImageKit via its plain REST API (fetch +
// FormData, HTTP Basic auth with the private key) instead of a Node-only SDK,
// so this runs on Cloudflare Workers. Returns the ImageKit-hosted URL and the
// fileId (needed later to delete this exact file when it's replaced or the
// trip is deleted).
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/imagekit.ts
git commit -m "feat: add ImageKit cover upload helper"
```

---

## Task 4: Cover upload/toggle API route

**Files:**
- Create: `src/app/api/trips/[id]/cover+api.ts`

- [ ] **Step 1: Write the route**

```ts
import { and, eq } from "drizzle-orm";

import { getUserId, unauthorized } from "@/server/auth";
import { db } from "@/server/db";
import { trips } from "@/server/db/schema";
import { uploadCoverImage } from "@/server/imagekit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound(): Response {
  return Response.json({ error: "Not found" }, { status: 404 });
}

// POST /trips/:id/cover — upload a custom cover photo. The Unsplash cover
// fields are left untouched so the user can switch back to them later.
export async function POST(request: Request, { id }: Record<string, string>) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) return notFound();

  const [existing] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .limit(1);
  if (!existing) return notFound();

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  let url: string;
  try {
    url = await uploadCoverImage(file, id);
  } catch (err) {
    console.error("ImageKit upload failed:", err);
    return Response.json(
      { error: "Upload failed. Please try again." },
      { status: 502 },
    );
  }

  await db
    .update(trips)
    .set({ customCoverImageUrl: url, useCustomCover: true })
    .where(eq(trips.id, id));

  return Response.json({ customCoverImageUrl: url, useCustomCover: true });
}

// PATCH /trips/:id/cover — switch between the custom photo and the original
// Unsplash cover, without re-uploading anything.
export async function PATCH(
  request: Request,
  { id }: Record<string, string>,
) {
  const userId = await getUserId(request);
  if (!userId) return unauthorized();
  if (!UUID_RE.test(id)) return notFound();

  const body = (await request.json()) as { useCustomCover?: boolean };
  if (typeof body.useCustomCover !== "boolean") {
    return Response.json(
      { error: "useCustomCover must be a boolean" },
      { status: 400 },
    );
  }

  const [row] = await db
    .select({ customCoverImageUrl: trips.customCoverImageUrl })
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .limit(1);
  if (!row) return notFound();

  if (body.useCustomCover && !row.customCoverImageUrl) {
    return Response.json(
      { error: "No custom photo to switch to" },
      { status: 400 },
    );
  }

  await db
    .update(trips)
    .set({ useCustomCover: body.useCustomCover })
    .where(eq(trips.id, id));

  return Response.json({ useCustomCover: body.useCustomCover });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/trips/[id]/cover+api.ts"
git commit -m "feat: add trip cover upload/toggle API route"
```

---

## Task 5: Client fetch helper — support file uploads

**Files:**
- Modify: `src/lib/api.ts:36-59`

- [ ] **Step 1: Add a `formData` option alongside the existing `json` one**

Replace:

```ts
type ApiInit = Omit<RequestInit, "body"> & { json?: unknown };

// Hook returning an authenticated fetch. Injects `Authorization: Bearer <token>`
// from Clerk and parses JSON, throwing ApiError (with the server message) on a
// non-2xx response.
export function useApiFetch() {
  const { getToken } = useAuth();

  return async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
    const { json, headers, ...rest } = init;
    const token = await getToken();

    let res: Response;
    try {
      res = await fetch(`${getApiBaseUrl()}${path}`, {
        ...rest,
        headers: {
          Accept: "application/json",
          ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: json !== undefined ? JSON.stringify(json) : undefined,
      });
```

with:

```ts
type ApiInit = Omit<RequestInit, "body"> & {
  json?: unknown;
  formData?: FormData;
};

// Hook returning an authenticated fetch. Injects `Authorization: Bearer <token>`
// from Clerk and parses JSON, throwing ApiError (with the server message) on a
// non-2xx response. Pass `formData` instead of `json` to send a file upload —
// no Content-Type is set for it, so `fetch` fills in the multipart boundary.
export function useApiFetch() {
  const { getToken } = useAuth();

  return async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
    const { json, formData, headers, ...rest } = init;
    const token = await getToken();

    let res: Response;
    try {
      res = await fetch(`${getApiBaseUrl()}${path}`, {
        ...rest,
        headers: {
          Accept: "application/json",
          ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: json !== undefined ? JSON.stringify(json) : (formData ?? undefined),
      });
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: support multipart file uploads in the shared fetch helper"
```

---

## Task 6: Client trip hooks

**Files:**
- Modify: `src/lib/trips.ts`

- [ ] **Step 1: Add the two new fields to `TripDetail`**

Replace:

```ts
export type TripDetail = TripListItem & {
  summary: string | null;
  pace: string | null;
  interests: string[];
  days: Day[];
  coverImagePhotographerName: string | null;
  coverImagePhotographerUrl: string | null;
  coverImageUnsplashUrl: string | null;
  images: TripImage[] | null;
};
```

with:

```ts
export type TripDetail = TripListItem & {
  summary: string | null;
  pace: string | null;
  interests: string[];
  days: Day[];
  coverImagePhotographerName: string | null;
  coverImagePhotographerUrl: string | null;
  coverImageUnsplashUrl: string | null;
  images: TripImage[] | null;
  customCoverImageUrl: string | null;
  useCustomCover: boolean;
};
```

- [ ] **Step 2: Add the two mutation hooks**

After `useDeleteTrip` (end of the file), add:

```ts

export function useUploadTripCover(id: string) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<{ customCoverImageUrl: string; useCustomCover: boolean }>(
        `/api/trips/${id}/cover`,
        { method: "POST", formData },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", id] }),
  });
}

export function useToggleTripCover(id: string) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (useCustomCover: boolean) =>
      apiFetch<{ useCustomCover: boolean }>(`/api/trips/${id}/cover`, {
        method: "PATCH",
        json: { useCustomCover },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", id] }),
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trips.ts
git commit -m "feat: add trip cover upload/toggle mutations"
```

---

## Task 7: Trip screen UI — camera button, toggle, custom cover display

**Files:**
- Modify: `src/components/trip/TripDetailView.tsx`

This is the discovery from reading the file while planning: the hero isn't a
single static image bound to `coverImageUrl` — it's the `HeroCarousel`
component, which swipes through `trip.images` (falling back to a one-photo
array built from `coverImageUrl` when `images` is empty). So "switch back to
existing photos" means: showing the custom photo replaces the whole carousel
with one static image, and toggling back restores the original swipeable
carousel — which also matches the plural "photos" in your last message.

- [ ] **Step 1: Add new imports**

Replace:

```ts
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Activity, Day, TripDetail, TripImage } from "@/lib/trips";
import { colors } from "@/theme/colors";
```

with:

```ts
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Activity, Day, TripDetail, TripImage } from "@/lib/trips";
import { useToggleTripCover, useUploadTripCover } from "@/lib/trips";
import { colors } from "@/theme/colors";
```

- [ ] **Step 2: Add the `CustomCover` component**

Right after the `HeroCarousel` function (after its closing `}` around line
107), add:

```tsx
// The user's uploaded photo, shown instead of the Unsplash HeroCarousel when
// trip.useCustomCover is true. Static (no swipe, no attribution) since it's
// a single photo the user picked themselves.
function CustomCover({ url }: { url: string }) {
  return (
    <View style={{ height: HERO_HEIGHT }} className="w-full">
      <Image
        source={{ uri: `${url}?tr=w-1200,q-70` }}
        style={{ width: "100%", height: HERO_HEIGHT }}
        contentFit="cover"
        transition={200}
      />
      <View className="absolute inset-0 bg-black/15" pointerEvents="none" />
    </View>
  );
}
```

- [ ] **Step 3: Add cover-upload state and handlers inside `TripDetailView`**

Right after the `confirmDelete` function (before the `images` computation),
add:

```ts
  const uploadCover = useUploadTripCover(trip.id);
  const toggleCover = useToggleTripCover(trip.id);
  const [coverError, setCoverError] = useState<string | null>(null);

  const pickCover = async () => {
    setCoverError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setCoverError(
        "Allow photo access in your phone's settings to add a custom photo.",
      );
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 1,
    });
    if (picked.canceled) return;

    const compressed = await ImageManipulator.manipulateAsync(
      picked.assets[0].uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );

    const formData = new FormData();
    formData.append("file", {
      uri: compressed.uri,
      name: "cover.jpg",
      type: "image/jpeg",
    } as unknown as Blob);

    uploadCover.mutate(formData, {
      onError: () =>
        setCoverError("Couldn't upload that photo. Please try again."),
    });
  };

  const toggleCoverSource = () => {
    setCoverError(null);
    toggleCover.mutate(!trip.useCustomCover, {
      onError: () =>
        setCoverError("Couldn't switch photos. Please try again."),
    });
  };
```

- [ ] **Step 4: Show the custom cover or the carousel**

Replace:

```tsx
        {/* Hero */}
        <View className="w-full" style={{ height: HERO_HEIGHT }}>
          <HeroCarousel images={images} />
```

with:

```tsx
        {/* Hero */}
        <View className="w-full" style={{ height: HERO_HEIGHT }}>
          {trip.useCustomCover && trip.customCoverImageUrl ? (
            <CustomCover url={trip.customCoverImageUrl} />
          ) : (
            <HeroCarousel images={images} />
          )}
```

- [ ] **Step 5: Add the camera and toggle buttons next to delete**

Replace:

```tsx
            <View className="flex-row items-center">
              <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/40">
                <Ionicons name="heart-outline" size={20} color={colors.surface} />
              </View>
              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-80"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="trash-outline" size={19} color={colors.surface} />
                )}
              </Pressable>
            </View>
```

with:

```tsx
            <View className="flex-row items-center">
              <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/40">
                <Ionicons name="heart-outline" size={20} color={colors.surface} />
              </View>
              {trip.customCoverImageUrl ? (
                <Pressable
                  onPress={toggleCoverSource}
                  disabled={toggleCover.isPending}
                  hitSlop={8}
                  className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-80"
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={19}
                    color={colors.surface}
                  />
                </Pressable>
              ) : null}
              <Pressable
                onPress={pickCover}
                disabled={uploadCover.isPending}
                hitSlop={8}
                className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-80"
              >
                {uploadCover.isPending ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="camera-outline" size={19} color={colors.surface} />
                )}
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full bg-black/40 active:opacity-80"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="trash-outline" size={19} color={colors.surface} />
                )}
              </Pressable>
            </View>
```

- [ ] **Step 6: Show the inline error banner**

Replace:

```tsx
        {/* Body */}
        <View className="px-5 pt-4">
          <Text className="font-pbold text-[24px] leading-[30px] text-ink">
            {trip.title ?? trip.destination}
          </Text>
```

with:

```tsx
        {/* Body */}
        <View className="px-5 pt-4">
          {coverError ? (
            <View className="mb-3 rounded-xl border border-error bg-error/10 px-3 py-2">
              <Text className="font-sans text-[13px] text-error">
                {coverError}
              </Text>
            </View>
          ) : null}
          <Text className="font-pbold text-[24px] leading-[30px] text-ink">
            {trip.title ?? trip.destination}
          </Text>
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npm run lint`
Expected: no new errors (pre-existing warnings unrelated to this file are fine).

- [ ] **Step 8: Commit**

```bash
git add src/components/trip/TripDetailView.tsx
git commit -m "feat: add camera button and cover toggle to trip detail screen"
```

---

## Task 8: Manual verification (developer, on-device)

The agent cannot run the app or rebuild natively (per `AGENTS.md`), so this
task is a checklist for the developer to run after Tasks 1-7 are committed,
the migration has been applied (Task 1, Step 4), and the native app has been
rebuilt (Task 2, Step 4):

- [ ] Open an existing trip's detail screen. Confirm the hero still shows the
      normal Unsplash carousel (unchanged behavior).
- [ ] Tap the new camera icon next to the trash icon. Grant photo permission
      when asked (first time only).
- [ ] Pick a photo from the gallery. Confirm the hero switches to that single
      photo (no swipe, no Unsplash attribution badge).
- [ ] Confirm a new toggle icon (swap arrows) appears next to the camera icon
      now that a custom photo exists.
- [ ] Tap the toggle. Confirm the hero switches back to the original
      Unsplash carousel (swipeable again, attribution badge visible).
- [ ] Tap the toggle again. Confirm it switches back to the custom photo.
- [ ] Close the trip screen and reopen it (or restart the app). Confirm
      whichever cover was last active is still showing (persisted in the DB).
- [ ] Tap the camera icon, then back out of the gallery picker without
      choosing anything. Confirm nothing changes and no error is shown.
- [ ] Turn off Wi-Fi/data, tap the camera icon, and pick a photo. Confirm an
      inline error message appears (not a crash) and the previous cover stays
      showing.
