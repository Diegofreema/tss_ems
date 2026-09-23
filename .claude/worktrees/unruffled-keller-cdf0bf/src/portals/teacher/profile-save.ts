import { useRouter } from '@tanstack/react-router'
import { useUpdateMyTeachingProfile } from '@/api/teaching/hooks'
import type { ProfileSave } from '@/features/profile/types'
import { teacherContactBody } from './profile'

/**
 * Saving the teaching record — the phone and the address, which is all a
 * teacher may correct on it. `POST /teachers/me` also takes a photo and a CV;
 * neither has a box on this page.
 */
export function useTeacherProfileSave(): ProfileSave {
  const router = useRouter()
  const save = useUpdateMyTeachingProfile()

  return {
    pending: save.isPending,
    save: async (values) => {
      // A refusal has already been announced by the mutation cache.
      const saved = await save.mutateAsync(teacherContactBody(values)).then(
        () => true,
        () => false,
      )
      // The page is filled by the route's loader, so it is the loader that has
      // to run again for the saved values to be what is on screen.
      if (saved) await router.invalidate()
    },
  }
}
