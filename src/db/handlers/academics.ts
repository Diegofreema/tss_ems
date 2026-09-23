import { classArmsService } from '@/api/class-arms/service'
import type { ClassArmBody } from '@/api/class-arms/types'
import { departmentsService } from '@/api/departments/service'
import type { DepartmentBody } from '@/api/departments/types'
import { subjectsService } from '@/api/subjects/service'
import type { SubjectBody, SubjectCreated } from '@/api/subjects/types'
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

/**
 * Creating a subject, or several — `department_ids` makes one per class.
 *
 * `newId` still reads `subject`, which the school sets to the first of them.
 * That is the right one to record: the device's local key stands for the row
 * the office filled the form in about, and the rest arrive with the next sync
 * like any other row this device did not make. Nothing chains off a subject's
 * id at creation time.
 *
 * The `note` is there because a batch can be **partly** refused — a name
 * already taken in one of the classes — and a 201 with `created: 2, failed: 1`
 * is otherwise indistinguishable from a clean run. The count has nowhere else
 * to go: a queued write's answer comes back to the drain, not to the form,
 * which may have been closed on Tuesday.
 */
registerHandler<SubjectBody>(WRITE.createSubject, {
  send: (body) => subjectsService.create(body),
  idempotent: false,
  newId: idUnder('subject'),
  note: subjectsMade,
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

/**
 * What the school actually made, in words, or nothing where there is nothing
 * worth saying — one subject asked for and one created is the ordinary case
 * and needs no sentence of its own.
 */
function subjectsMade(answer: unknown): string | undefined {
  const made = answer as SubjectCreated | null
  const created = Number(made?.created ?? 0)
  const refused = Array.isArray(made?.failed) ? made.failed.length : 0

  if (refused > 0) {
    return `${created} subject${created === 1 ? '' : 's'} created. ${refused} ${
      refused === 1 ? 'class was' : 'classes were'
    } refused — the name is most likely already taken there.`
  }
  return created > 1 ? `${created} subjects created, one for each class.` : undefined
}
