import { serve } from "inngest/edge";

import { inngest } from "@/server/inngest/client";
import {
  syncUserCreated,
  syncUserDeleted,
  syncUserUpdated,
} from "@/server/inngest/functions";

// Inngest serve endpoint. `inngest/edge` returns a web-standard
// (Request) => Promise<Response> handler that maps 1:1 onto Expo Router's API
// route verb exports:
//   PUT  — register/sync this app's functions with the Inngest dev server
//   GET  — introspection used during that sync
//   POST — invoke a function when an event fires
const handler = serve({
  client: inngest,
  functions: [syncUserCreated, syncUserUpdated, syncUserDeleted],
});

export function GET(request: Request) {
  return handler(request);
}

export function POST(request: Request) {
  return handler(request);
}

export function PUT(request: Request) {
  return handler(request);
}
