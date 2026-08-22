// Per-user trip cap, shared by every route that can create a generation.
//
// It lives here rather than in `trips+api.ts` because two routes now enforce it:
// POST /trips (a new trip) and POST /trips/:id/retry (re-running a failed one).
// Two copies of the number would eventually disagree, and the retry route is
// exactly where that would go unnoticed — a failed trip does not count against
// the cap while it is failed, so retrying is the one path that can push a user
// over the limit.
export const MAX_TRIPS = 5;

// One message, so the app shows the same wording whichever route rejects.
export const TRIP_LIMIT_MESSAGE = `You've reached the limit of ${MAX_TRIPS} trips. Delete one to plan a new trip.`;
