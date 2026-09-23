import { classArmsService } from '@/api/class-arms/service'
import type { ClassArmBody } from '@/api/class-arms/types'
import { departmentsService } from '@/api/departments/service'
import type { DepartmentBody } from '@/api/departments/types'
import { subjectsService } from '@/api/subjects/service'
import type { SubjectBody } from '@/api/subjects/types'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { idUnder } from '../new-id'
import { registerHandler } from '../registry'

/**
 * The arms a class is split into, and the subjects it carries.
 *
 * Creating either is **not** idempotent — the school issues the id, so a replay
 * would make a second arm or a second subject. Updating and deleting are: both
 * name a row that already exists.
 *
 * Neither delete is ever forced. Forcing an arm leaves results and attendance
 * pointing at one that is gone, and forcing a subject leaves results, materials
 * and topics doing the same — so the API's refusal is the right answer, and the
 * drain treats it as terminal and puts it in front of a person.
 */

registerHandler<ClassArmBody>(WRITE.createArm, {
  send: (body) => classArmsService.create(body),
  idempotent: false,
  newId: idUnder('class_arm'),
  collectionId: SET.refArms,
})

registerHandler<{ id: Id; body: ClassArmBody }>(WRITE.updateArm, {
  send: ({ id, body }) => classArmsService.update(id, body),
  idempotent: true,
  collectionId: SET.refArms,
})

registerHandler<Id>(WRITE.removeArm, {
  send: (id) => classArmsService.remove(id),
  idempotent: true,
  collectionId: SET.refArms,
})

registerHandler<SubjectBody>(WRITE.createSubject, {
  send: (body) => subjectsService.create(body),
  idempotent: false,
  newId: idUnder('subject'),
  collectionId: SET.refSubjects,
})

registerHandler<{ id: Id; body: SubjectBody }>(WRITE.updateSubject, {
  send: ({ id, body }) => subjectsService.update(id, body),
  idempotent: true,
  collectionId: SET.refSubjects,
})

registerHandler<Id>(WRITE.removeSubject, {
  send: (id) => subjectsService.remove(id),
  idempotent: true,
  collectionId: SET.refSubjects,
})

/**
 * Withdrawing a subject or putting it back.
 *
 * Idempotent: it says which of the two states the subject should be in, not
 * "toggle", so sending it twice leaves it where it was meant to be. That is
 * what makes it safe to queue at all — a toggle replayed is a toggle undone.
 */
registerHandler<{ id: Id; offered: boolean }>(WRITE.setSubjectStatus, {
  send: ({ id, offered }) =>
    offered ? subjectsService.activate(id) : subjectsService.deactivate(id),
  idempotent: true,
  collectionId: SET.refSubjects,
})

/**
 * The classes themselves.
 *
 * Deleting one is **never forced**: `students.department_id` cannot be null, so
 * a class taken out from under its students leaves them unable to load anywhere
 * that joins their class. The API's refusal is the right answer, and the drain
 * treats it as terminal and puts it in front of a person.
 *
 * `collectionId` names the detailed set, which is what the register draws. The
 * plain one every form's class dropdown reads is refreshed with everything else
 * by the resync `dropDerivedReads` runs at the end of a drain.
 */
registerHandler<DepartmentBody>(WRITE.createClass, {
  send: (body) => departmentsService.create(body),
  idempotent: false,
  newId: idUnder('department'),
  collectionId: SET.refClassCensus,
})

registerHandler<{ id: Id; body: DepartmentBody }>(WRITE.updateClass, {
  send: ({ id, body }) => departmentsService.update(id, body),
  idempotent: true,
  collectionId: SET.refClassCensus,
})

registerHandler<Id>(WRITE.removeClass, {
  send: (id) => departmentsService.remove(id),
  idempotent: true,
  collectionId: SET.refClassCensus,
})
