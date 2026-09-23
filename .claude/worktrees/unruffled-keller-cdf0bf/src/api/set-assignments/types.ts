import type { PageParams } from '../types.ts'

/**
 * An assignment the teacher has set, as `GET /setassignments` lists it.
 *
 * The pupil's own list of the same assignments is `Assignment` in `../assignments`,
 * and the two are not the same record read twice: this one carries the class,
 * the term and the teacher who set it, and nothing about whether anybody has
 * sat it. Where they share a field name they mean the same thing, with one
 * exception — see `total_questions`.
 *
 * `subject`, `class` and `semester` are names beside their ids rather than
 * nested records, so they are read as the strings they are.
 */
export type Assignment = {
  id: number
  title?: string | null
  details?: string | null
  /** `cbt_test` on every assignment set so far; the school's own word for the kind. */
  test_type?: string | null
  subject_id?: number | null
  subject?: string | null
  /** The class the assignment is set for. The API's word for a class is department. */
  department_id?: number | null
  class?: string | null
  semester_id?: number | null
  semester?: string | null
  teacher_id?: number | null
  /** `active` on an assignment pupils may reach. The teacher's state, not a pupil's. */
  status?: string | null
  opendate?: string | null
  /**
   * When it shuts. Written `2026-09-09 14:57:53` here — no zone and a space
   * rather than a `T`, where the pupil's list of the same assignment sends
   * `2026-08-28T10:08`. Both are the school's own clock; see `schoolTime`.
   */
  closedate?: string | null
  /** Minutes allowed once a pupil starts. Null means the window is the limit. */
  time_limit?: number | null
  passing_score?: number | null
  /**
   * How many questions the assignment actually holds — 0 on an assignment just created,
   * 1 once one question is written. Not the pupil's `total_questions`, which
   * is what the assignment claims to hold and can disagree with what it does.
   */
  total_questions?: number | null
}

/** Unverified: the endpoint pages, so it is assumed to take the page. */
export type AssignmentListParams = PageParams & {
  subject_id?: number
  status?: string
}

/**
 * What creating or editing an assignment sends.
 *
 * No `opendate` or `closedate`: neither is in the body the API documents, and
 * the school fills the closing date in itself. An assignment's window is therefore
 * not the teacher's to set from here.
 */
export type AssignmentBody = {
  subject_id: number
  department_id: number
  title: string
  details?: string
  test_type: string
  time_limit?: number | null
  passing_score?: number | null
  /** Only on an edit. Creating always lands the assignment `active`. */
  status?: string
}

/** One choice of a multiple-choice question, with the answer key on it. */
export type QuestionOption = {
  id?: number
  option_text?: string | null
  /** Which one is right. Never sent to the pupil sitting the assignment. */
  is_correct?: boolean | null
}

/**
 * One question of an assignment as its teacher reads it — the pupil's `Question` is
 * this with the answer key taken off.
 */
export type AssignmentQuestion = {
  id: number
  question_text?: string | null
  question_type?: QuestionType | null
  points?: number | null
  order_number?: number | null
  difficulty_level?: string | null
  /** Empty on a theory question, which is marked by hand. */
  options?: QuestionOption[] | null
}

export type QuestionType = 'multiple_choice' | 'theory'

/**
 * What writing a question sends. An option carries `is_correct` only where it
 * is the right one — the API's own body omits it on the rest.
 *
 * `order_number` and `difficulty_level` come back on a question but are not in
 * the body the API documents, so nothing here sends them.
 */
export type QuestionBody = {
  question_text: string
  question_type: QuestionType
  points: number
  options?: { option_text: string; is_correct?: true }[]
}

/** `GET /setassignments/{assignmentId}/questions` — the assignment's questions and its total. */
export type AssignmentQuestions = {
  questions: AssignmentQuestion[]
  count?: number | null
  /** What the assignment is worth: the points of every question added up. */
  total_marks?: number | null
}

/**
 * One pupil's submission, as the assignment's submission list rows it.
 *
 * Read off bronze rather than guessed: the pupil is a name and an admission
 * number flat on the row, the submitted stamp arrives already formatted, and
 * the row's own id is called `assignment_id` — assignment 35's submission is
 * 36, so it is the submission's id and not the assignment's.
 */
export type AssignmentSubmission = {
  /** The submission's own id. The name is the school's; the meaning is ours. */
  assignment_id: number
  student_id?: number | null
  /** The pupil's whole name, not a record. */
  student?: string | null
  regno?: string | null
  status?: string | null
  /** Formatted by the school, US-style — `9/2/26, 5:56 PM`. */
  submitted?: string | null
  /** Null until somebody has marked it; the school scores nothing itself. */
  total_score?: number | null
  graded?: boolean | null
}

/**
 * `GET /setassignments/{assignmentId}/submissions` — who has submitted.
 *
 * The three counters are the school's own and are siblings of the list, so
 * they are shown as sent rather than counted off rows that may be a page of
 * the whole.
 */
export type AssignmentSubmissions = {
  /** The server's own key for the assignment these were sent against. */
  paper: Assignment
  submissions: AssignmentSubmission[]
  /** How many pupils have submitted. */
  sat?: number | null
  marked?: number | null
  /** Submitted and still waiting on a teacher. */
  waiting?: number | null
}

/**
 * One choice, as the marking view sends it: the answer key and what the pupil
 * picked, on the option itself.
 */
export type MarkingOption = {
  id: number
  option_text?: string | null
  is_correct?: boolean | null
  /** True on the one the pupil chose. */
  chosen?: boolean | null
}

/**
 * One answer to mark.
 *
 * `score` is null on every answer of a submitted assignment, multiple choice
 * included — this school scores nothing on its own, so every mark on the sheet
 * is the teacher's. The answer key is still sent, on the options, which is
 * what lets the sheet propose the multiple-choice marks rather than ask for
 * them.
 */
export type MarkingAnswer = {
  /** What `scores` is keyed on when the marks go back. Not the question's id. */
  answer_id: number
  question_id?: number | null
  /** The wording. Called `question` here and `question_text` on the assignment. */
  question?: string | null
  question_type?: QuestionType | null
  points?: number | null
  /** The mark given, once one has been. */
  score?: number | null
  /** What was written, on a theory question. */
  theory_answer?: string | null
  options?: MarkingOption[] | null
}

/** The submission itself, as the marking view heads it. */
export type MarkedSubmissionHead = {
  /** The submission's own id, as on the list. */
  assignment_id: number
  /** The assignment it was sent against. */
  setassignment_id?: number | null
  /** The assignment's title, under the server's own word for it. */
  paper?: string | null
  student?: string | null
  student_id?: number | null
  status?: string | null
  /** When it was marked, and the only thing that says whether it was. */
  graded_at?: string | null
  teacher_comments?: string | null
  total_score?: number | null
}

/**
 * `GET /setassignments/submissions/{submissionId}` — one submission, ready to
 * mark. Two siblings rather than one record: the submission, and its answers.
 */
export type MarkedSubmission = {
  submission: MarkedSubmissionHead
  answers?: MarkingAnswer[] | null
}

/**
 * What marking sends.
 *
 * `scores` is keyed on `answer_id` and valued by the mark given. `regrade`
 * says this is a correction of a submission already marked — sent only for one
 * that is, since an untouched submission is not being re-graded.
 */
export type GradeBody = {
  scores: Record<string, number>
  comment?: string
  regrade?: boolean
}
