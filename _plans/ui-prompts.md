# Triply — UI Design Image-Generation Prompts

Prompts for generating UI mockups of the Triply app screens (from `PLAN.md`).
Palette pulled from `app.json`: splash blue `#208AEF`, light-blue icon
background `#E6F4FE`.

**Usage notes:**
- `--ar 9:19.5` is a Midjourney flag (phone aspect ratio).
- For DALL·E / ChatGPT / Sora image: remove the `--ar` line and instead say
  "portrait mobile screen, 1080×2340".
- Each screen prompt starts with `[USE MASTER STYLE]` — prepend the master style
  prompt (section 1) to keep a consistent look.
- Replace "Tokyo" with any destination you want featured.

---

## 1. Master style prompt (base look)

```
High-fidelity mobile app UI design for "Triply", an AI travel trip-planner app,
iOS and Android, portrait orientation. Modern, clean, friendly travel aesthetic.
Bright and airy with lots of white space. Primary color vivid sky-blue (#208AEF),
soft light-blue tint backgrounds (#E6F4FE), white surfaces, dark charcoal text,
one warm accent (coral/amber) for calls to action. Rounded cards with soft
shadows and 16–20px corner radius. Clean geometric sans-serif typography, clear
hierarchy. Generous padding, tab-free stack navigation, large friendly buttons.
Subtle travel motifs (map pins, routes, sun, plane). Full-bleed destination
photography inside cards. Pixel-perfect, realistic app mockup, Figma-style,
high detail, soft daylight. --ar 9:19.5
```

## 2. Home screen

```
[USE MASTER STYLE] Home screen of the Triply travel app. Top: friendly greeting
"Hi, ready for your next trip?" with a small round user avatar. A large primary
button "Generate a trip" with a sparkle/AI icon. Below, a vertical list of
past-trip cards — each card shows a full-width destination cover photo (e.g.
Tokyo, Paris), the city name, and a small row of chips: number of days,
travelers, and budget level. Clean, scrollable, lots of white space. --ar 9:19.5
```

## 3. Empty state (brand-new user)

```
[USE MASTER STYLE] Empty-state Home screen of the Triply app for a new user.
Centered friendly illustration of a suitcase, map pin, and a dotted travel route.
Headline "No trips yet" with subtext "Plan your first adventure with AI." One
large primary button "Generate a trip". Minimal, welcoming, playful. --ar 9:19.5
```

## 4. Generate-trip form

```
[USE MASTER STYLE] "Plan a trip" form screen in the Triply app. A clean vertical
form with clearly labeled fields: a destination text input with a location pin
icon ("Where to?"), a stepper for number of days (1–7), a stepper for number of
travelers, a segmented control for budget level (Budget / Mid-range / Luxury),
and a group of selectable interest chips (Food, History, Nature, Nightlife,
Relaxed, Adventure). A big primary "Generate trip" button pinned at the bottom.
Soft rounded inputs, blue accents. --ar 9:19.5
```

## 5. Loading / generating screen

```
[USE MASTER STYLE] Loading screen of the Triply app while AI builds a trip.
Centered animated-style illustration of a spinning globe or a plane following a
dotted route around a map pin. Playful progress text "Crafting your Tokyo
itinerary…" with a subtle progress indicator and a few rotating tip lines. Calm,
optimistic, blue gradient background. --ar 9:19.5
```

## 6. Trip detail screen

```
[USE MASTER STYLE] Trip detail screen of the Triply app. Top: full-width hero
cover photo of the destination with the trip title overlaid ("5 Days in Tokyo")
and small chips for travelers and budget. Below: a short AI overview paragraph,
then a day-by-day itinerary as sections — each day has a themed title ("Day 1 ·
Old Tokyo & Temples") and a vertical timeline of activity cards grouped by
Morning / Afternoon / Evening. Each activity card shows a place name, one-line
description, a rough cost, and a small map-pin icon. A subtle delete icon in the
header. Clean, scannable, editorial travel-guide feel. --ar 9:19.5
```

---

## Portfolio / showcase shot

```
[USE MASTER STYLE] Three Triply app screens shown side by side on floating phone
mockups — Home, Generate form, and Trip detail — on a soft light-blue (#E6F4FE)
background with gentle shadows. Marketing-style product showcase. --ar 16:9
```
