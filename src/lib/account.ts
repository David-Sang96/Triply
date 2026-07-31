import { useClerk } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApiFetch } from "@/lib/api";
import { clearPreferences } from "@/lib/preferences";

/**
 * Deletes the signed-in user's account for good.
 *
 * The route deletes the Clerk user; the database rows and uploaded images are
 * removed by the `clerk/user.deleted` webhook job (see
 * src/app/api/account+api.ts). On success this clears everything held on the
 * device for that account and signs out, which drops the app back to /welcome.
 */
export function useDeleteAccount() {
  const apiFetch = useApiFetch();
  const { signOut } = useClerk();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true; alreadyDeleted?: boolean }>("/api/account", {
        method: "DELETE",
      }),
    onSuccess: async () => {
      // The account is already gone by this point, so nothing here may turn a
      // successful deletion into a failure — anything thrown from onSuccess
      // rejects mutateAsync, and the caller would show a "couldn't delete"
      // alert for an account that no longer exists.
      //
      // Storage first, then the session: signing out unmounts the signed-in
      // tree, and this must not be left half-done if that re-render is quick.
      // clearPreferences swallows its own failures, so only signOut needs a
      // guard.
      await clearPreferences();
      try {
        await signOut();
      } catch (err) {
        // The Clerk session is invalid anyway now the user is deleted, and the
        // signed-in layout redirects to /welcome once it notices.
        console.error("Sign-out after account deletion failed:", err);
      }
      // The cached trips/chats belong to an account that no longer exists.
      qc.clear();
    },
  });
}
