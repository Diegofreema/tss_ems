import { enqueue } from '@/db/drain'
import { WRITE } from '@/db/ids'
import type { ProfileSave } from '@/features/profile/types'
import { studentContactBody } from './profile'

/**
 * Saving the student's own record — the phone and the address, which is all
 * `POST /students/me` accepts.
 *
 * Queued rather than sent: a student correcting their address on a connection
 * that has gone keeps the correction, and the queue's toast says "saved on
 * this device" only when the send actually has to wait. The form keeps what
 * was typed — which is what was saved — so nothing here re-reads the record.
 */
export function useStudentProfileSave(): ProfileSave {
  return {
    pending: false,
    save: async (values) => {
      // Awaited: the button spins until the school has answered.
      await enqueue({
        handler: WRITE.updateStudentRecord,
        payload: studentContactBody(values),
        toast: { success: 'Your details were saved' },
        label: 'Your details',
      })
    },
  }
}
