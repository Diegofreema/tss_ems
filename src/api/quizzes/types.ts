import type { PageParams } from '../types.ts'

/**
 * A quiz — an objective paper that marks itself the moment it is handed in.
 *
 * Its own record in its own tables as of 2026-10-02. Before that a quiz was a
 * `setassignments` row with `test_type: 'cbt_test'`, and the two were told
 * apart by that column; the column is gone, and so are the four fields that
 * only ever meant anything on a quiz (`time_limit`, `passing_score`,
 * `total_questions`, `test_type`). An assignment is now written work a
 * teacher reads; a quiz is this.
 *
 * Written from the school's own collection of 2026-10-02 — the create, the
 * record, the questions and the sittings carry example answers there, and
 * this is those answers' shape. **Nothing here has been read off a live
 * answer yet**: neither deployment this portal talks to had the controller
 * when it was written. Where the document shows no answer at all, the reader
 * in `read.ts` takes the likeliest spellings rather than one guess.
 */
export type Quiz = {
  id: number
  /** The quiz's name. Sent as `quizname`, answered as `name`. */
  name?: string | null
  description?: string | null
  subject?: string | null
  subject_id?: number | null
  class?: string | null
  /** The class. The API's word for a class is department. */
  department_id?: number | null
  /** Null means every arm of the class — the ordinary case, not a gap. */
  class_arm_id?: number | null
  teacher_id?: number | null
  status?: QuizStatus | null
  /** Null means no clock. */
  duration_minutes?: number | null
  total_marks?: number | null
  /** A percentage of the marks, compared with the percentage a sitting scores. */
  pass_mark_percent?: number | null
  /** How many of the written questions a pupil is asked — a bank of 30 can be a paper of 10. */
  asks?: number | null
  shuffled?: boolean | null
  /** `2026-02-10 00:00`: the school's own clock, no zone. */
  opens?: string | null
  closes?: string | null
  marked_automatically?: boolean | null
  /** On the teacher's single read, with the answer key. Absent on a list. */
  questions?: QuizQuestion[] | null
}

/**
 * `draft` until it is published, `active` while pupils can sit it, `closed`
 * once it is over. A quiz is never open the moment it is made: it has no
 * questions yet.
 */
export type QuizStatus = 'draft' | 'active' | 'closed'

export type QuizQuestionType = 'multiple_choice' | 'true_false'

/**
 * One question, as its teacher reads it. The pupil's paper is this with
 * `correct_option` and `markable` taken off and what they chose put on.
 */
export type QuizQuestion = {
  id: number
  question?: string | null
  question_type?: QuizQuestionType | null
  mark?: number | null
  order?: number | null
  /**
   * Keyed by the option's number, `"1"` to `"4"`. A true/false question
   * writes its own two.
   */
  options?: Record<string, string> | null
  /** The option's number, not its text — see `QuizQuestionBody.correctans`. */
  correct_option?: string | number | null
  /** False where no answer is recorded, which would mark the class wrong. */
  markable?: boolean | null
}

/** `GET /quizzes/{id}` — the quiz, and what stands between it and the class. */
export type QuizRecord = {
  quiz: Quiz
  /** How many pupils have sat it. Above zero, the paper is locked. */
  sittings?: number | null
  /** Why it cannot be opened to the class yet, in the school's own words. Null when it can. */
  publish_problem?: string | null
}

/**
 * `GET /quizzes/options` — what this teacher may set a quiz for.
 *
 * Maps keyed by id rather than lists. `arms_by_class` is keyed by class so
 * the arm box offers only the chosen class's arms: arm names repeat across a
 * school, and a quiz naming another class's arm reaches nobody.
 */
export type QuizOptions = {
  subjects?: Record<string, string> | null
  classes?: Record<string, string> | null
  arms_by_class?: Record<string, Record<string, string>> | null
  /** False for the office, which is offered everything. */
  narrowed?: boolean | null
  question_types?: string[] | null
  statuses?: string[] | null
}

export type QuizListParams = PageParams & { status?: QuizStatus }

/**
 * What setting or editing a quiz sends. Every key is the school's.
 *
 * `start_date`/`end_date` go through `strtotime()` on the server, which reads
 * `02/10/2026` as the 10th of February — the document's own example came back
 * as `2026-02-10`. So they are sent `YYYY-MM-DD HH:MM:SS`, which nothing reads
 * two ways.
 */
export type QuizBody = {
  quizname?: string
  subject_id?: number
  department_id?: number
  class_arm_id?: number | null
  description?: string
  /** Minutes. Null is no clock. */
  duration?: number | null
  /** A percentage. */
  pass_mark?: number | null
  total_questions?: number | null
  shuffle_questions?: boolean
  start_date?: string | null
  end_date?: string | null
  /** Only from the office, which owns no paper of its own. */
  teacher_id?: number
}

/** `POST /quizzes/{id}/publish`. */
export type PublishBody = { status: 'active' | 'closed' }

/**
 * What writing a question sends. `correctans` is the option's **number**,
 * `"1"` to `"4"`: storing the text would mean correcting a typo in an option
 * changed who passed. A true/false question writes its own options, so
 * `op1`–`op4` are left off it.
 */
export type QuizQuestionBody = {
  question: string
  question_type: QuizQuestionType
  op1?: string
  op2?: string
  op3?: string
  op4?: string
  correctans: string
  mark: number
  question_order?: number
}

/** One pupil's sitting, as the teacher's results list it. Never documented beyond its name. */
export type QuizSitting = Record<string, unknown>

/** `GET /quizzes/{id}/sittings` — every sitting, best first, and the summary over them. */
export type QuizSittings = {
  quiz?: Quiz | null
  sittings?: QuizSitting[] | null
  summary?: { sat?: number | null; passed?: number | null; pass_mark?: number | null } | null
}
