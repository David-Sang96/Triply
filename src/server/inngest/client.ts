import { Inngest } from "inngest";

// Single Inngest client for the app. In development `INNGEST_DEV=1` (set in
// .env) makes the SDK talk to the local Inngest dev server, so no event or
// signing keys are needed.
//
// `isDev` is passed explicitly rather than left to the SDK's own inference.
// Inferred, it depends on `INNGEST_DEV` being *absent* in production — and that
// variable does exist in the local .env that `expo export` loads. If it ever
// reached a deployment, the client would quietly try to reach a dev server on
// localhost, and every `clerk/user.created` event would vanish: new accounts
// would get no `users` row and their first trip would fail. Stating the mode
// makes production deterministic.
export const inngest = new Inngest({
  id: "triply",
  isDev: process.env.INNGEST_DEV === "1",
});
