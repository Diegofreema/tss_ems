import { teachingService } from '@/api/teaching/service'
import { myNotices } from './my-notices'
import { setAssignments } from './set-assignments'
import type {
  EClass,
  TeacherClassArm,
  TeacherResult,
  TeacherStudent,
  TeacherSubject,
  Topic,
} from '@/api/teaching/types'
import { schoolCollection } from '../collection'
import { SET } from '../ids'

/**
 * Everything the teacher's own pages read, on the teacher's own device.
 *
 * Every endpoint here is under `/teachers/me` and resolves the caller from the
 * token, so a device only ever holds the arms, the roll and the marks that
 * belong to whoever signed in on it. That is the rule the skill asks for:
 * narrow at the fetch, not at the query.
 *
 * What is stored is the school's own shape. The `Row` a register draws is
 * presentation — formatted marks, a birthday spelled the reader's way — and is
 * derived on every render rather than written to disk, so a change of copy
 * never costs a migration.
 */

/**
 * How much of the roll and the mark sheet is asked for at once.
 *
 * Both endpoints paginate and both are read whole here — a teacher's roll is
 * the students in their own arms and the marks are their own subjects' — so
 * this is one page in every school this runs in. A teacher with more than this
 * many students wants a search parameter on the endpoint, which it does not
 * have today, rather than a longer limit.
 */
export const ALL = 500

/** The subjects the office has put in this teacher's hands. */
export const teacherSubjects = schoolCollection<TeacherSubject, number>({
  id: SET.teachingSubjects,
  fetch: () => teachingService.subjects(),
  getKey: (subject) => subject.id,
  schemaVersion: 1,
})

/** The roll: every student in the arms this teacher takes. */
export const teacherRoll = schoolCollection<TeacherStudent, number>({
  id: SET.teachingStudents,
  fetch: () => teachingService.students({ limit: ALL }).then((roll) => roll.items),
  getKey: (student) => student.id,
  schemaVersion: 1,
})

/**
 * The arms the roll was drawn from, which arrive beside it rather than on it.
 *
 * Its own set because an arm the teacher takes but which holds nobody appears
 * in no student's row — reading the arms off the roll would lose exactly the
 * arm whose register has yet to be taken. Asked for with `limit: 1`, as the
 * form's own feed already did: one student is enough of the roll to carry the
 * arms, and the roll itself is the set above.
 */
export const teacherArms = schoolCollection<TeacherClassArm, number>({
  id: SET.teachingArms,
  fetch: () => teachingService.students({ limit: 1 }).then((roll) => roll.class_arms),
  getKey: (arm) => arm.id,
  schemaVersion: 1,
})

/** Every mark on file in the subjects this teacher takes. */
export const teacherMarks = schoolCollection<TeacherResult, number>({
  id: SET.teachingResults,
  fetch: () => teachingService.results({ limit: ALL }).then((page) => page.items),
  getKey: (mark) => mark.id,
  schemaVersion: 1,
})

/** What the teacher has recorded covering, subject by subject. */
export const teacherTopics = schoolCollection<Topic, number>({
  id: SET.teachingTopics,
  fetch: () => teachingService.topics(),
  getKey: (topic) => topic.id,
  schemaVersion: 1,
})

/** The online rooms opened for this teacher's classes. */
export const teacherEClasses = schoolCollection<EClass, number>({
  id: SET.teachingEClasses,
  fetch: () => teachingService.eclasses(),
  getKey: (eclass) => eclass.id,
  schemaVersion: 1,
})

/*
 * Upload batches are deliberately absent.
 *
 * `GET /teachers/me/uploads` answers `{"batches": []}` for every teaching login
 * on this deployment, so nobody has seen what a batch row holds — and a
 * collection needs a key. The four ids the detail endpoint takes are the only
 * key there could be, and which fields carry them is exactly what has not been
 * observed. Storing rows under a key guessed from an unseen shape is how a
 * register quietly holds two copies of the same batch, so this one stays on
 * the query path until a batch exists to read. See `batch-row.ts`, which reads
 * the same shape defensively for the same reason.
 */

/** Everything the teacher portal keeps on the device. */
export const teachingCollections = [
  teacherSubjects,
  teacherRoll,
  teacherArms,
  teacherMarks,
  teacherTopics,
  teacherEClasses,
  myNotices,
  // The list alone. The questions, submissions and scripts fan out per
  // assignment and are preloaded by the routes that read them instead — see
  // `set-assignments.ts`.
  setAssignments,
]
