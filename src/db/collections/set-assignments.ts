import { setAssignmentsService } from '@/api/set-assignments/service'
import type {
  Assignment,
  AssignmentQuestion,
  AssignmentSubmissions,
  MarkedSubmission,
} from '@/api/set-assignments/types'
import { schoolCollection } from '../collection'
import { SET } from '../ids'
import { mergeHeld } from '../merge-held'
import { readSnapshot } from '../snapshot'

/**
 * The teaching side of the CBT, on the teacher's own device.
 *
 * Four sets, because the flow is four different answers: the assignments the
 * teacher has set, the questions written into each, who has submitted, and
 * each submitted script ready to mark. Everything below `setAssignments` fans
 * out per assignment — a school holds papers in the low tens at most — and a
 * refusing slice keeps the copy the device already held (`mergeHeld`), so a
 * flaky refetch cannot erase a paper's questions or a class's scripts.
 *
 * The list syncs with the teacher's shell; the heavier three are preloaded by
 * the routes that read them, the same decision `refClassCensus` records —
 * scripts are one request per submission, and that belongs to the teacher who
 * opens Marking, not to every visit to the portal.
 */

/** A teacher's assignments are counted in tens; one page is the whole list. */
const ALL = 200

export const setAssignments = schoolCollection<Assignment, number>({
  id: SET.teachingAssignments,
  fetch: () => setAssignmentsService.list({ limit: ALL }).then((page) => page.items),
  getKey: (assignment) => assignment.id,
  schemaVersion: 1,
})

/**
 * Whose papers the fan-outs below cover, read off the copy the assignments
 * set already keeps and only asked for when there is none — the same shape
 * the register days use, and for the same reason: `queryClient.query` inside
 * a fetcher pauses offline and never settles.
 */
async function heldAssignments(): Promise<Assignment[]> {
  return (
    readSnapshot<Assignment>(SET.teachingAssignments) ??
    (await setAssignmentsService.list({ limit: ALL }).then((page) => page.items))
  )
}

/** One question, carrying the assignment it belongs to. */
export type TeacherQuestion = AssignmentQuestion & { assignment_id: number }

/**
 * Every question of every paper, in one set.
 *
 * `setassignments/{id}/questions` is a different answer per assignment and a
 * collection is one set, so the answers are held together and each row says
 * which paper it belongs to — the questions page filters, without a request.
 * The endpoint's `total_marks` sibling is not stored: it is the points added
 * up, which `totalMarks` already works out from the rows exactly.
 */
export const setQuestions = schoolCollection<TeacherQuestion, number>({
  id: SET.teachingQuestions,
  fetch: async () => {
    const assignments = await heldAssignments()

    const held = new Map<number, TeacherQuestion[]>()
    for (const question of readSnapshot<TeacherQuestion>(SET.teachingQuestions) ?? []) {
      const slice = held.get(question.assignment_id)
      if (slice) slice.push(question)
      else held.set(question.assignment_id, [question])
    }

    const results = await Promise.all(
      assignments.map(async (assignment) => ({
        key: assignment.id,
        fresh: await setAssignmentsService
          .questions(assignment.id)
          .then(({ questions }) =>
            questions.map(
              (question): TeacherQuestion => ({ ...question, assignment_id: assignment.id }),
            ),
          )
          .catch(() => undefined),
      })),
    )

    return mergeHeld(results, held).flat()
  },
  getKey: (question) => question.id,
  schemaVersion: 1,
})

/**
 * One assignment's submissions, whole: the list *and* the school's own
 * sat / marked / waiting counters, which are siblings of it. Keyed by the
 * assignment, so the set is one document per paper.
 */
export type SubmissionsDoc = AssignmentSubmissions & { id: number }

export const setSubmissions = schoolCollection<SubmissionsDoc, number>({
  id: SET.teachingSubmissions,
  fetch: async () => {
    const assignments = await heldAssignments()
    const held = new Map(
      (readSnapshot<SubmissionsDoc>(SET.teachingSubmissions) ?? []).map((doc) => [doc.id, doc]),
    )

    const results = await Promise.all(
      assignments.map(async (assignment) => ({
        key: assignment.id,
        fresh: await setAssignmentsService
          .submissions(assignment.id)
          .then((doc): SubmissionsDoc => ({ ...doc, id: assignment.id }))
          .catch(() => undefined),
      })),
    )

    return mergeHeld(results, held)
  },
  getKey: (doc) => doc.id,
  schemaVersion: 1,
})

/**
 * One submitted script, answers and all, keyed by the submission's own id —
 * which the school sends under the name `assignment_id`; the name is the
 * school's, the meaning is ours. This is the set that makes marking possible
 * with no signal: the written answers are on the device before the teacher
 * leaves the staffroom.
 */
export type Script = MarkedSubmission & { id: number }

/** Whose scripts, off the submissions set's own copy where it has one. */
async function submissionDocs(): Promise<SubmissionsDoc[]> {
  const kept = readSnapshot<SubmissionsDoc>(SET.teachingSubmissions)
  if (kept) return kept

  const fetched = await Promise.all(
    (await heldAssignments()).map((assignment) =>
      setAssignmentsService
        .submissions(assignment.id)
        .then((doc): SubmissionsDoc => ({ ...doc, id: assignment.id }))
        .catch(() => undefined),
    ),
  )
  return fetched.filter((doc): doc is SubmissionsDoc => doc !== undefined)
}

export const setScripts = schoolCollection<Script, number>({
  id: SET.teachingScripts,
  fetch: async () => {
    const docs = await submissionDocs()

    const wanted = docs.flatMap((doc) =>
      (doc.submissions ?? []).map((submission) => submission.assignment_id),
    )
    const held = new Map(
      (readSnapshot<Script>(SET.teachingScripts) ?? []).map((script) => [script.id, script]),
    )

    const results = await Promise.all(
      wanted.map(async (submissionId) => ({
        key: submissionId,
        fresh: await setAssignmentsService
          .submission(submissionId)
          .then((script): Script => ({ ...script, id: submissionId }))
          .catch(() => undefined),
      })),
    )

    return mergeHeld(results, held)
  },
  getKey: (script) => script.id,
  schemaVersion: 1,
})
