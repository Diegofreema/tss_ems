import { enqueue } from '@/db/drain'
import { WRITE } from '@/db/ids'
import type { ProfileSave } from '@/features/profile/types'
import { teacherContactBody } from './profile'

/**
 * Saving the teaching record — the phone and the address, which is all a
 * teacher may correct on it. `POST /teachers/me` also takes a photo and a CV;
 * neither has a box on this page.
 *
 * Queued rather than sent: a teacher correcting their number in a staffroom
 * with no signal keeps the correction, and the queue's toast says "saved on
 * this device" only when the send actually has to wait. The form keeps what
 * was typed — which is what was saved — so nothing here re-reads the record.
 */
export function useTeacherProfileSave(): ProfileSave {
  return {
    pending: false,
    save: async (values) => {
      // Awaited: the button spins until the school has answered.
      await enqueue({
        handler: WRITE.updateTeachingProfile,
        payload: teacherContactBody(values),
        toast: { success: 'Your details were saved' },
        label: 'Your details',
      })
    },
  }
}
