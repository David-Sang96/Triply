import { Inngest } from "inngest";

// Single Inngest client for the app. In development `INNGEST_DEV=1` (set in .env)
// makes the SDK talk to the local Inngest dev server, so no event or signing
// keys are needed. Production keys are wired up later.
export const inngest = new Inngest({ id: "triply" });
