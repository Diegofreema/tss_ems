import { teachingKeys } from '@/api/teaching/keys'
import { teachingService } from '@/api/teaching/service'
import type {
  EClass,
  TeacherClassArm,
  TeacherResult,
  TeacherStudent,
  TeacherSubject,
  Topic,
} from '@/api/teaching/types'
import { heldRows as held } from '@/db/collection'
import {
  teacherArms,
  teacherEClasses,
  teacherMarks,
  teacherRoll,
  teacherSubjects,
  teacherTopics,
} from '@/db/collections/teaching'
import { queryClient } from '@/lib/query-client'

export { ALL } from '@/db/collections/teaching'

/**
 * The lists behind the teacher's pages, each asked for once.
 *
 * These are adapters now, not fetchers: the sets themselves live on the device
 * in `src/db/collections/teaching.ts`, and each of these readies its collection
 * and hands back what it holds. So a count tile, a record page and a sub-table
 * all read the same rows the register is drawing, without any of them making a
 * request — and they keep working with no connection.
 *
 * A promise rather than a plain array because the first read on a cold start
 * genuinely has to wait for the sync, and every caller here already awaited
 * one. `preload` is the documented way to make a collection ready and is safe
 * from anywhere that reads; it is only a mutation handler and the outbox drain
 * that must never call it.
 *
 * A refusal still reaches the caller. A device that has synced this set before
 * answers from the copy it kept, so reaching this at all means the school has
 * never been reached on this device — which is worth saying rather than
 * passing off as an empty register.
 */

export const mySubjects = (): Promise<TeacherSubject[]> => held(teacherSubjects)

export const myStudents = (): Promise<TeacherStudent[]> => held(teacherRoll)

/** The arms the roll was drawn from, including any that hold nobody. */
export const myArms = (): Promise<TeacherClassArm[]> => held(teacherArms)

export const myMarks = (): Promise<TeacherResult[]> => held(teacherMarks)

export const myTopics = (): Promise<Topic[]> => held(teacherTopics)

export const myEClasses = (): Promise<EClass[]> => held(teacherEClasses)

/**
 * Upload batches, still read through the cache rather than off the device.
 *
 * The one list here that is not local-first, and deliberately: a collection is
 * keyed, and `GET /teachers/me/uploads` answers `{"batches": []}` for every
 * teaching login on this deployment, so which fields carry the four ids that
 * name a batch is exactly what nobody has seen. See the note in
 * `src/db/collections/teaching.ts`.
 */
export const myBatches = () =>
  queryClient.query({
    queryKey: teachingKeys.uploads(),
    queryFn: () => teachingService.uploadBatches(),
  })
