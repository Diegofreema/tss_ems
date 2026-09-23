import type {
  AssignmentQuestion,
  AssignmentSubmission,
  GradeBody,
  MarkingAnswer,
} from '../../../../api/set-assignments/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'
import { when } from '../../../../features/collections/when.ts'

/**
 * Marking what the students of one assignment sent back.
 *
 * **This endpoint** scores nothing — every answer of a submitted assignment
 * comes back with `score: null`, multiple choice included — so every mark a
 * teacher sees on the sheet is worked out here. That is a fact about the
 * marking view and not about the school: the student's own result route has
 * the multiple choice scored from the moment they submit (`result.ts` sets
 * out both readings side by side). Reading this line as "nobody has marked it
 * anywhere" is a mistake that has already been made once. What the school does send is the answer key,
 * on the options, which settles every multiple-choice answer outright: those
 * marks are read off the key and are not the teacher's to change. What is left
 * for a teacher to decide is the written answers, which is the whole of what a
 * person is needed for.
 */

export type SubmissionState = 'To mark' | 'Marked' | 'Marked by the system'

/**
 * Whether a question is one the answer key can settle on its own.
 *
 * The same rule `isChoice` applies to an answer, asked of the question before
 * anybody has answered it: the school's own word for it, or the choices that
 * make it one. Anything else — a theory question, or one that arrives with
 * neither a type nor options — is a person's to read.
 */
function keyCanSettle(question: AssignmentQuestion): boolean {
  if (question.question_type === 'theory') return false
  return question.question_type === 'multiple_choice' || (question.options?.length ?? 0) > 0
}

/**
 * Whether this paper needs a person at all.
 *
 * A paper of nothing but multiple choice has no judgement left in it: the
 * student picked an option, the assignment says which option is right, and
 * both came back in the same payload. Every mark on it is arithmetic, and
 * since the marks were made read-only there is not one figure on the sheet a
 * teacher could change.
 *
 * **A paper holding no questions needs a person too.** Not because there is
 * anything to read, but because a submission against an empty paper is not a
 * thing to quietly file a nought for — that is a paper somebody set wrong, and
 * it belongs in front of them.
 */
export function needsTeacher(questions: readonly AssignmentQuestion[]): boolean {
  if (questions.length === 0) return true
  return questions.some((question) => !keyCanSettle(question))
}

/**
 * Whether anybody — or anything — has marked this submission.
 *
 * `graded` is the school's own answer where it sends one. A total on its own
 * is the fallback, for the marking view, which sends `graded_at` instead.
 *
 * The third state exists because the first two were a lie on a paper with no
 * theory on it. **The school scores nothing itself** — every answer of a
 * submitted assignment comes back `score: null`, multiple choice included, and
 * `graded: false` beside it — so a paper the answer key settles completely
 * still read "To mark", and sat under "Waiting on you" until a teacher opened
 * it and pressed Save on a sheet where every figure was already right and none
 * of them was editable. That is not marking, it is a ceremony, and the tile
 * above it was claiming work that did not exist.
 *
 * So a submission the key settles says so. It is a *reading* of what the app
 * already knows, not a claim about the school's records — `autoGradable` is
 * what actually files it, and once that lands the school says `graded` and
 * this reads 'Marked' like anything else.
 */
export function stateOf(
  submission: AssignmentSubmission,
  /** Whether the paper this belongs to needs a person — `needsTeacher`. */
  needsAPerson = true,
): SubmissionState {
  const graded = submission.graded ?? submission.total_score != null
  if (graded) return 'Marked'
  return needsAPerson ? 'To mark' : 'Marked by the system'
}

/** What still needs marking comes first; within that, whoever submitted first. */
const ORDER: Record<SubmissionState, number> = {
  'To mark': 0,
  // Between the two: settled, but not yet on the school's record. A teacher
  // scanning the list is looking for what is theirs, and this is not.
  'Marked by the system': 1,
  Marked: 2,
}

export function submissionRows(
  submissions: AssignmentSubmission[],
  /** Whether the paper needs a person. Defaults to yes, which is the old reading. */
  needsAPerson = true,
): Row[] {
  return submissions
    .map((submission) => ({ submission, state: stateOf(submission, needsAPerson) }))
    .sort(
      (a, b) =>
        ORDER[a.state] - ORDER[b.state] ||
        Number(a.submission.assignment_id) - Number(b.submission.assignment_id),
    )
    .map(({ submission, state }) => ({
      // The submission's own id, under the name the school gives it.
      id: String(submission.assignment_id),
      name:
        submission.student?.trim() || `Student ${submission.student_id ?? submission.assignment_id}`,
      adm: submission.regno?.trim() || BLANK,
      // Already formatted by the school, and in its own style — read back onto
      // the one every other date on these pages is shown in. `when` hands back
      // whatever it was sent if it will not parse, so nothing is invented.
      submitted: when(submission.submitted, true),
      score: submission.total_score == null ? BLANK : String(submission.total_score),
      state,
    }))
}

function isTheory(answer: MarkingAnswer): boolean {
  return answer.question_type === 'theory'
}

/**
 * Whether this answer can be marked against the answer key.
 *
 * Not simply "not theory": an answer that arrives with no `question_type` at
 * all — the marking view has sent one — would be read as multiple choice by
 * that rule and scored nought for having no options to be right about. It
 * counts as a choice when the school says it is one, or when it carries the
 * choices that make it one.
 */
export function isChoice(answer: MarkingAnswer): boolean {
  if (isTheory(answer)) return false
  return answer.question_type === 'multiple_choice' || (answer.options?.length ?? 0) > 0
}

/**
 * How one answer is named when its mark is sent back.
 *
 * The answer's own id, not the question's — the school's example marks
 * `{"305": 8}`, and every answer carries an `answer_id` of that shape.
 */
export function answerKey(answer: MarkingAnswer): string {
  return String(answer.answer_id)
}

/** What the student picked, in words. Empty where they answered nothing. */
export function chosenOption(answer: MarkingAnswer): string {
  return answer.options?.find((option) => option.chosen)?.option_text?.trim() ?? ''
}

/** What the assignment says is right. */
export function correctOption(answer: MarkingAnswer): string {
  return answer.options?.find((option) => option.is_correct)?.option_text?.trim() ?? ''
}

/**
 * Whether the student picked the right option, where the answer has one to pick.
 * Null on a theory answer and on one nobody answered — neither is a wrong
 * answer, and showing them as one would be marking a student down for the shape
 * of the question.
 */
export function wasRight(answer: MarkingAnswer): boolean | null {
  if (!isChoice(answer)) return null
  const chosen = answer.options?.find((option) => option.chosen)
  return chosen ? Boolean(chosen.is_correct) : null
}

/**
 * What the answer key gives this answer, and null where it has nothing to say.
 *
 * The question's own points where the student picked the right option, and
 * nought where they did not — which includes the ones they left alone, since
 * an unanswered question earns nothing whatever the reason it was skipped.
 */
export function keyScore(answer: MarkingAnswer): number | null {
  if (!isChoice(answer)) return null
  return wasRight(answer) === true ? (answer.points ?? 0) : 0
}

/**
 * What the sheet opens on for one answer.
 *
 * **A multiple-choice mark is the key's, and the key's alone** (the teacher's
 * call, 2026-09-16). It used to be a *proposal* the teacher could type over,
 * which is what a marking sheet ought to offer for a judgement — but this is
 * not a judgement: the student picked an option, the assignment says which
 * option is right, and both came back in the same payload. Offering a box
 * invited a teacher to overrule arithmetic they cannot see the working of, and
 * to disagree with the "Multiple choice right" tile sitting above it.
 *
 * So the key wins even over a mark already on file. A stored score that
 * disagrees is a mark given by hand before this rule, and re-saving the
 * submission replaces it — `overruled` is how the card says so out loud
 * rather than letting it change under the teacher.
 *
 * A written answer is nobody's to propose: it opens on the mark given, or
 * empty.
 */
export function openingScore(answer: MarkingAnswer): string {
  const key = keyScore(answer)
  if (key !== null) return String(key)
  return answer.score != null ? String(answer.score) : ''
}

/**
 * A mark on file for a choice answer that the answer key does not agree with,
 * and null where there is none.
 *
 * Only ever non-null for a submission marked before the key became the
 * authority, or one whose key has been corrected since. The card shows it, so
 * a mark about to be replaced is a mark the teacher was told about.
 */
export function overruled(answer: MarkingAnswer): number | null {
  const key = keyScore(answer)
  if (key === null || answer.score == null) return null
  const stored = Number(answer.score)
  return Number.isFinite(stored) && stored !== key ? stored : null
}

export function openingScores(answers: MarkingAnswer[]): Record<string, string> {
  const scores: Record<string, string> = {}
  for (const answer of answers) scores[answerKey(answer)] = openingScore(answer)
  return scores
}

/**
 * The answers a teacher has to read rather than confirm — everything the
 * answer key cannot settle, which is the written ones and anything that came
 * back without the choices to be marked against.
 */
export function needsHand(answers: MarkingAnswer[]): MarkingAnswer[] {
  return answers.filter((answer) => !isChoice(answer))
}

/** How many of the multiple-choice answers match the key. */
export function rightCount(answers: MarkingAnswer[]): number {
  return answers.filter((answer) => wasRight(answer) === true).length
}

/** How many of them there were to get right. */
export function choiceCount(answers: MarkingAnswer[]): number {
  return answers.filter(isChoice).length
}

/** What the whole assignment was worth. */
export function maxTotal(answers: MarkingAnswer[]): number {
  return answers.reduce((sum, answer) => sum + (answer.points ?? 0), 0)
}

/** A mark as it is being typed: blank counts as nothing given yet, not zero. */
function figure(value: string | undefined): number | null {
  const digits = (value ?? '').replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

/** What the submission stands at while the sheet is being filled in. */
export function runningTotal(
  answers: MarkingAnswer[],
  scores: Record<string, string>,
): number {
  return answers.reduce(
    (sum, answer) => sum + (figure(scores[answerKey(answer)]) ?? 0),
    0,
  )
}

/**
 * What the sheet sends: a mark for every answer.
 *
 * Every one of them, not the written ones alone — this school scores nothing
 * itself, so an answer left out of `scores` is an answer left unmarked. A box
 * the teacher emptied is nought given, which is a decision they took by
 * pressing save. `regrade` goes only on a submission already marked.
 */
export function gradeBody({
  answers,
  scores,
  comment,
  marked,
}: {
  answers: MarkingAnswer[]
  scores: Record<string, string>
  comment: string
  marked: boolean
}): GradeBody {
  const given: Record<string, number> = {}
  for (const answer of answers) {
    const key = answerKey(answer)
    given[key] = figure(scores[key]) ?? 0
  }

  return {
    scores: given,
    ...(comment.trim() ? { comment: comment.trim() } : {}),
    ...(marked ? { regrade: true } : {}),
  }
}

/**
 * The submissions this device can file from the answer key alone, right now.
 *
 * Four conditions, and each one is there to stop a write that would be wrong
 * rather than merely redundant:
 *
 *  - **the paper needs no person** (`needsTeacher`), or filing would be this
 *    app inventing a mark for something somebody has to read;
 *  - **the school has not already graded it**, or a teacher's own marks would
 *    be overwritten by the key on every visit to the page;
 *  - **nothing is queued for it**, so a pass that runs twice before the first
 *    send lands does not queue the same marks twice;
 *  - **the script is on the device**, because the body is keyed on `answer_id`
 *    and there is nothing to key without the answers.
 *
 * Pure, so the decision to write on somebody's behalf is a thing with a test
 * rather than a condition buried in an effect.
 */
export function autoGradable(
  submissions: readonly AssignmentSubmission[],
  scripts: readonly { id: number; answers?: MarkingAnswer[] | null }[],
  needsAPerson: boolean,
  alreadyQueued: ReadonlySet<string>,
): { id: string; answers: MarkingAnswer[] }[] {
  if (needsAPerson) return []

  const held = new Map(scripts.map((script) => [String(script.id), script.answers ?? []]))

  return submissions
    .filter((submission) => stateOf(submission, false) === 'Marked by the system')
    .map((submission) => String(submission.assignment_id))
    .filter((id) => !alreadyQueued.has(id))
    .map((id) => ({ id, answers: held.get(id) ?? [] }))
    // A script with no answers on it is not an empty paper to file a nought
    // for — it is one this device has not read yet.
    .filter((one) => one.answers.length > 0)
}
