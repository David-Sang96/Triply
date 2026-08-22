/// <reference types="expo/types" />

// Why this file exists.
//
// Expo generates `expo-env.d.ts` at the repo root with exactly the reference
// above, and that generated file is gitignored — Expo's own template puts it
// there, and the file itself says so. That is fine on a developer's machine,
// where `expo start` recreates it. It is not fine in CI, which does a clean
// checkout and therefore has no CSS module declarations at all, so
// `import "../../global.css"` in src/app/_layout.tsx fails to type check:
//
//   error TS2882: Cannot find module or type declarations for side-effect
//   import of '../../global.css'.
//
// Repeating the reference here is harmless locally — TypeScript resolves the
// same declarations twice and dedups them — and it is what lets
// `npx tsc --noEmit` pass on a clean checkout.
//
// Deliberately a *separate* file rather than un-ignoring `expo-env.d.ts`: that
// file is generated, says it should not be edited, and un-ignoring it would
// mean every regeneration shows up as a diff to review.
//
// If a future SDK adds more references to the generated file, CI will fail the
// same way it did the first time and this file needs the same line added.
