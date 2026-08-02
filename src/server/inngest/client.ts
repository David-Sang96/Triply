import { Inngest } from "inngest";

// Single Inngest client for the app. In development `INNGEST_DEV=1` (set in
// .env) makes the SDK talk to the local Inngest dev server, so no event or
// signing keys are needed.
//
// `isDev` is passed explicitly, and production wins regardless of the flag.
//
// `INNGEST_DEV=1` is not merely *absent* in production — `expo export` loads
// the local .env, and the value really does reach the deployment. A first
// production deploy proved it: /api/inngest reported `"mode":"dev"` while
// serving from EAS Hosting. In that state the client points at a dev server on
// localhost, so every `clerk/user.created` event silently disappears — new
// accounts get no `users` row, and their first trip fails.
//
// So the deciding factor is NODE_ENV, which the same runtime already sets to
// "production" (src/server/auth.ts:16 relies on it, and that check fires during
// deploy). The flag can then only ever turn dev mode ON locally.
export const inngest = new Inngest({
  id: "triply",
  isDev:
    process.env.NODE_ENV !== "production" && process.env.INNGEST_DEV === "1",
});
