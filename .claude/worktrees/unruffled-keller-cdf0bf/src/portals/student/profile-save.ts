import { useRouter } from '@tanstack/react-router'
import { useUpdateMyStudentRecord } from '@/api/my-schooling/hooks'
import type { ProfileSave } from '@/features/profile/types'
import { studentContactBody } from './profile'

/**
 * Saving the pupil's own record — the phone and the address, which is all
 * `POST /students/me` accepts.
 */
export function useStudentProfileSave(): ProfileSave {
  const router = useRouter()
  const save = useUpdateMyStudentRecord()

  return {
    pending: save.isPending,
    save: async (values) => {
      // A refusal has already been announced by the mutation cache.
      const saved = await save.mutateAsync(studentContactBody(values)).then(
        () => true,
        () => false,
      )
      // The page is filled by the route's loader, so it is the loader that has
      // to run again for the saved values to be what is on screen.
      if (saved) await router.invalidate()
    },
  }
}
