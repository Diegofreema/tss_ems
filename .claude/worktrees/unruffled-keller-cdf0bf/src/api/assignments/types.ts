/**
 * An assignment set for a class, as `GET /assignments` lists it.
 *
 * `subject` and `class` are names rather than nested records — this endpoint
 * flattens them, unlike every other list on the API. Read them as the strings
 * they are.
 *
 * Two fields count the same thing and disagree: `total_questions` is what the
 * teacher said the assignment would hold when they set it, and `question_count` is
 * how many questions they have actually written. Assignment 6 says 4 and 1. The
 * pupil is shown the second — an assignment says "1 question" and holds one.
 */
export type Assignment = {
  id: number
  title?: string | null
  details?: string | null
  /** `cbt_test` on every assignment so far; the school's own word for the kind. */
  test_type?: string | null
  /** The teacher's own state for the assignment, e.g. `active`. Not the pupil's. */
  status?: string | null
  subject_id?: number | null
  subject?: string | null
  department_id?: number | null
  class?: string | null
  opendate?: string | null
  /**
   * When it shuts. Sent with no zone and no seconds — `2026-08-28T10:08` —
   * while `opendate` beside it carries `+01:00`. Both are the school's clock;
   * see `schoolTime`.
   */
  closedate?: string | null
  /** Minutes allowed once started. Null means the window is the only limit. */
  time_limit?: number | null
  total_questions?: number | null
  passing_score?: number | null
  question_count?: number | null
  my_status?: AssignmentStatus | null
  submitted?: boolean | null
  /**
   * Null while the assignment can be sat; otherwise the school's own sentence for
   * why it cannot — "This test has closed." Sent on the list row, and on the
   * detail as a sibling of `assignment` rather than a field on it.
   */
  window_problem?: string | null
}

export type AssignmentStatus =
  | 'available'
  | 'in_progress'
  | 'submitted'
  | 'completed'

export type QuestionOption = {
  id: number
  option_text?: string | null
  order_number?: number | null
}

/**
 * One question of an assignment. The answer key is never sent to a pupil: options
 * carry their text and nothing marking one of them right.
 */
export type Question = {
  id: number
  question_text?: string | null
  question_type?: 'multiple_choice' | 'theory' | string | null
  /** What the question is worth. A theory question is marked by hand. */
  points?: number | null
  /** Empty on a theory question. */
  options?: QuestionOption[] | null
}

/** The pupil's own attempt at an assignment, where they have made one. */
export type MySubmission = {
  id: number
  status?: string | null
  start_time?: string | null
  end_time?: string | null
  /** Null until a teacher has marked it. */
  total_score?: number | null
  teacher_comments?: string | null
}

/**
 * `GET /assignments/{setassignmentId}` — the assignment and its questions.
 *
 * The nested `assignment` sends `question_count`, `my_status`, `submitted` and
 * `window_problem` as null on this route whatever the list said, so read those
 * four from here: `questions.length`, `my_submission` and the sibling
 * `window_problem`.
 */
export type AssignmentDetail = {
  assignment: Assignment
  window_problem?: string | null
  my_submission?: MySubmission | null
  deadline?: string | null
  questions?: Question[] | null
}

/**
 * What is sent back on submit: question id to answer — an option id for
 * multiple choice, the written text for theory. An option belonging to another
 * question is discarded rather than scored, and so is a key naming a question
 * that is not on the assignment.
 */
export type SubmitAssignmentBody = {
  answers: Record<string, number | string>
  /** When the pupil actually opened the assignment. See `startedAt` in `assignment.ts`. */
  actual_start_time?: string
}

/** How one answer was marked. */
export type ResultAnswer = {
  question_id: number
  question_text?: string | null
  question_type?: string | null
  points?: number | null
  selected_option_id?: number | null
  theory_answer?: string | null
  is_correct?: boolean | null
  /**
   * Only on the teacher's marking view, together with `correct_option_id`.
   * A pupil is told whether they were right, never which option was.
   */
  theory_score?: number | null
  correct_option_id?: number | null
}

export type ResultScore = {
  total_questions?: number | null
  correct_answers?: number | null
  total_score?: number | null
  max_points?: number | null
  percentage?: number | null
}

/**
 * `GET /assignments/results/{id}` — where the id is the **submission's**, off
 * `my_submission.id`, not the assignment's. The assignment's id is refused with "That
 * result could not be found."
 *
 * Its own `assignment.id` is the submission id too, so the assignment cannot be
 * reached back from here; it is the title and the subject only.
 */
export type AssignmentResult = {
  assignment?: {
    id: number
    title?: string | null
    subject?: string | null
    status?: string | null
    start_time?: string | null
    end_time?: string | null
    /** Wall-clock span, `03:59:07`, worked out by the school. */
    duration?: string | null
    is_graded?: boolean | null
    teacher_comments?: string | null
  } | null
  student?: { id: number; regno?: string | null; name?: string | null } | null
  score?: ResultScore | null
  answers?: ResultAnswer[] | null
}

/** The marking view — a submission with `correct_option_id` on each answer. */
export type Submission = AssignmentResult
