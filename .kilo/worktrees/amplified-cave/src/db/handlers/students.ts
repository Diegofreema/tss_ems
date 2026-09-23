import { mySchoolingService } from '@/api/my-schooling/service'
import type { UpdateMyRecordBody } from '@/api/my-schooling/types'
import { studentsService } from '@/api/students/service'
import type { StudentBody } from '@/api/students/types'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { idUnder } from '../new-id'
import { registerHandler } from '../registry'

/**
 * The student register.
 *
 * Enrolling one is **not** idempotent — the school issues the admission number
 * and the id, so a replay admits the same child twice. Correcting a record and
 * suspending or reinstating one are: both name a student who already exists.
 *
 * There is no delete. The API has no route for one, which the register already
 * knows: a student who should not be on it is declined or suspended, and the
 * record stays because everything filed against it does.
 */

registerHandler<StudentBody>(WRITE.enrolStudent, {
  send: (body) => studentsService.create(body),
  idempotent: false,
  newId: idUnder('student'),
  collectionId: SET.refStudents,
})

registerHandler<{ id: Id; body: StudentBody }>(WRITE.updateStudent, {
  send: ({ id, body }) => studentsService.update(id, body),
  idempotent: true,
  collectionId: SET.refStudents,
})

/**
 * Suspending a student or putting them back. Idempotent: the op says which
 * standing they should end in rather than "toggle".
 */
registerHandler<{ id: Id; status: 'Active' | 'Suspended' }>(WRITE.setStudentStanding, {
  send: ({ id, status }) => studentsService.setStatus(id, { status }),
  idempotent: true,
  collectionId: SET.refStudents,
})

/**
 * The student's own phone and address — all `POST /students/me` accepts.
 * Idempotent: the same fields over the caller's own record.
 */
registerHandler<UpdateMyRecordBody>(WRITE.updateStudentRecord, {
  send: (body) => mySchoolingService.updateRecord(body),
  idempotent: true,
  collectionId: SET.schoolingRecord,
})
