import { useQueryClient } from '@tanstack/react-query'
import { useUpdateMyProfile } from '@/api/users/hooks'
import { refreshAccount } from '@/features/auth/session'
import { profileBody } from '@/features/profile/to-body'
import type { ProfileSave } from '@/features/profile/types'

/**
 * Saving the office record. `PATCH /users/profile` writes to the same row
 * `GET /admins/profile` filled the form from, so the two agree.
 */
export function useAdminProfileSave(): ProfileSave {
  const queryClient = useQueryClient()
  const save = useUpdateMyProfile()

  return {
    pending: save.isPending,
    save: async (values) => {
      // A refusal has already been announced by the mutation cache; swallowing
      // it here only keeps it out of the submit handler.
      const saved = await save.mutateAsync(profileBody(values)).then(
        () => true,
        () => false,
      )
      // The name is on the sidebar and in the greeting too, so the session has
      // to be re-read before either can go stale.
      if (saved) await refreshAccount(queryClient).catch(() => undefined)
    },
  }
}
