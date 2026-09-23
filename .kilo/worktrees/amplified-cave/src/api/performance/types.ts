/**
 * How a student, a class or a paper is doing, under `/performance`.
 *
 * Arithmetic over the marks and the register — nothing here predicts anything
 * and every figure can be checked by hand, which is the whole point: a
 * teacher who disagrees with a number can see what went into it.
 *
 * **Read off live answers on 2026-09-08, all of them empty.** The school this
 * was read against has five marks on file and none of them approved, so every
 * envelope below is verified and every *row* inside one is not: no `terms`
 * entry, no `subjects` entry, no mover and no flagged student has ever been
 * seen. The containers are typed exactly; the rows are handed on as they
 * arrived, with what the endpoint promises each one carries written down
 * beside them, rather than guessing at field names nobody has produced. Same
 * decision, and the same reason, as `SeriesPoint` in `src/api/analytics`.
 *
 * Two things run through the whole family and are worth reading once:
 *
 * - **Only approved marks count**, which is what makes these agree with the
 *   report sheet. Unapproved ones are counted in `pending_excluded` rather
 *   than silently dropped, and `include_pending` shows the provisional
 *   picture for somebody who wants it.
 * - **`message` is the answer when there is no answer.** Every endpoint says
 *   in a sentence why it is empty — no marks entered, none approved yet, too
 *   few students to correlate. A screen shows that sentence instead of drawing
 *   zeroes, which is the one wrong answer these pages could give.
 */

/**
 * What the class-wide reads say they were asked about, with the ids expanded.
 *
 * Handed back so a page can title itself with the school's own words for the
 * class and the term, rather than re-joining the ids it just sent.
 */
export type PerformanceScope = {
  department_id: number | null
  /** That class, expanded. */
  class: string | null
  class_arm_id: number | null
  class_arm: string | null
  session_id: number | null
  session: string | null
  semester_id: number | null
  /** The term, expanded. The API calls a term a semester throughout. */
  semester: string | null
}

/**
 * A student's attendance over the period, as the performance reads count it.
 *
 * `rate` is null where nothing was marked — not zero, which would read as a
 * child who never turned up — and `reading` is the sentence to show in its
 * place: "No register has been marked for this student in this period."
 */
export type PerformanceAttendance = {
  present: number
  absent: number
  late: number
  excused: number
  /** Days with a mark of any kind. The denominator behind `rate`. */
  marked: number
  /** Percentage, or null where there is nothing to work it out from. */
  rate: number | null
  reading: string | null
}

/**
 * A duplicate the endpoint had to settle: two marks for the same student,
 * subject and term. The newest is kept and counted, and the clash is listed
 * here for somebody in the office to sort out.
 *
 * **Never seen populated.** Which ids a row carries is unconfirmed.
 */
export type PerformanceDuplicate = Record<string, unknown>

/** The student a `/performance/student/{id}` answer is about. Seen live. */
export type PerformanceStudent = {
  id: number
  name: string
  regno: string | null
  /** The class and the arm, expanded — the school's own words for them. */
  class: string | null
  class_arm: string | null
}

/**
 * One term of a student's history, in the order it happened.
 *
 * **Unverified**: `terms` was empty on the only live reading. It carries the
 * term and that term's average — enough to draw the line a `direction` is
 * read off — but under names nobody has seen.
 */
export type PerformanceTerm = Record<string, unknown>

/**
 * One subject, measured against the student's **own** average rather than the
 * class's — a child on 55 who scores 80 everywhere else is struggling; a
 * child on 55 in a class averaging 40 is not. That comparison is the reason
 * this endpoint exists rather than the report sheet being read twice.
 *
 * **Unverified**: `subjects` was empty on the only live reading.
 */
export type PerformanceSubject = Record<string, unknown>

export type StudentPerformanceParams = {
  subject_id?: number
  session_id?: number
  semester_id?: number
  /**
   * `1` to include marks nobody has approved — the provisional picture. Left
   * off, only approved marks count and the rest are counted in
   * `pending_excluded`.
   */
  include_pending?: 1
}

/** `GET /performance/student/{id}`. The envelope is verified; the rows are not. */
export type StudentPerformance = {
  student: PerformanceStudent
  /** In the order they happened, so a chart reads left to right as time. */
  terms: PerformanceTerm[]
  /** Which way the student is going across those terms. */
  direction: string | null
  /** The student's own average, which each subject is then measured against. */
  own_average: number | null
  subjects: PerformanceSubject[]
  strongest: PerformanceSubject | null
  weakest: PerformanceSubject | null
  attendance: PerformanceAttendance
  /** Marks on file that no one has approved, so they are not in the figures. */
  pending_excluded: number
  duplicates: PerformanceDuplicate[]
  /** Why the answer is empty, where it is. Shown instead of zeroes. */
  message: string | null
}

/**
 * One subject across a class: average, highest, lowest, spread, pass rate and
 * a grade breakdown.
 *
 * The spread is what separates two classes on the same average — everybody on
 * 50, against a class split between 20 and 80 — and is the figure a head of
 * department actually acts on.
 *
 * **Unverified**: `subjects` was empty on the only live reading.
 */
export type ClassSubjectPerformance = Record<string, unknown>

/**
 * How many students fall in each grade band.
 *
 * **Verified now that this school has approved marks**, and it is not the
 * array of rows this file guessed while every reading came back empty: the
 * endpoint sends a plain map of band to count, `{"-": 2, "A": 5, "B": 1}`,
 * on `overall` and on every subject alike. The `-` band is the marks the
 * school has recorded no letter for, and it is a real band with a real count,
 * not a blank to drop.
 *
 * The row shape is kept beside it because `gradeLines` still reads one, and
 * because a bucket is the one thing here cheap enough to tolerate twice.
 */
export type GradeCounts = Record<string, number>

/** One band as a row, which is the shape this was written against. */
export type GradeBucket = Record<string, unknown>

export type ClassPerformanceParams = {
  /** The class. Required — the endpoint answers for one class at a time. */
  department_id: number
  class_arm_id?: number
  session_id?: number
  semester_id?: number
}

/**
 * `GET /performance/class`.
 *
 * **Staff only, and deliberately so**: in a class of three, the class average
 * is one subtraction away from a named student's mark. Nothing here may be put
 * in front of a guardian.
 */
export type ClassPerformance = {
  scope: PerformanceScope
  subjects: ClassSubjectPerformance[]
  weakest_subject: ClassSubjectPerformance | null
  strongest_subject: ClassSubjectPerformance | null
  overall: {
    pupils: number
    marks_counted: number
    average: number | null
    pass_rate: number | null
    grades: GradeCounts
  }
  pending_excluded: number
  duplicates: PerformanceDuplicate[]
  message: string | null
}

/**
 * A student whose average moved between the two terms named.
 *
 * **Unverified**: every one of `movers`, `risers` and `fallers` was empty on
 * the only live reading, which was itself a request that named no terms.
 */
export type Mover = Record<string, unknown>

/**
 * Both ends of the comparison are required, and the endpoint says so in
 * `message` rather than refusing when they are missing.
 */
export type MoversParams = {
  department_id: number
  from_session_id?: number
  from_semester_id: number
  to_session_id?: number
  to_semester_id: number
}

/**
 * `GET /performance/movers` — not who is top, which the report sheet already
 * says, but who **changed** between two terms.
 *
 * A student with no mark in the earlier term is left out rather than reported
 * as a fall from nothing. `movers` is both lists together; `risers` and
 * `fallers` are the same students separated.
 */
export type Movers = {
  movers: Mover[]
  risers: Mover[]
  fallers: Mover[]
  message: string | null
}

/**
 * One student's attendance beside their average — a row of the scatter.
 *
 * **Unverified**: `pupils` was empty on the only live reading.
 */
export type AttendanceVsMarksRow = Record<string, unknown>

export type AttendanceVsMarksParams = {
  department_id: number
  /** `YYYY-MM-DD`, both ends inclusive, bounding the register side. */
  from?: string
  to?: string
}

/**
 * `GET /performance/attendance-vs-marks`.
 *
 * The correlation is reported **only with five or more students who have both**
 * an average and a marked register; below that it is null and
 * `correlation_reading` is null with `message` saying why. A coefficient off
 * three students is noise dressed as a finding, and the endpoint refuses to
 * dress it — a screen must not fill the gap with a number of its own.
 */
export type AttendanceVsMarks = {
  scope: PerformanceScope
  pupils: AttendanceVsMarksRow[]
  /** Students who had both, so the denominator behind the five-student floor. */
  pairs: number
  /** Pearson's r, or null where there were too few pairs to report one. */
  correlation: number | null
  /** That coefficient in words. Null wherever `correlation` is. */
  correlation_reading: string | null
  message: string | null
}

/**
 * A student the thresholds picked out, with the figures that put them there.
 *
 * The collection's own test asserts each row carries a non-empty `reasons`
 * array; **no populated row has been seen**, so that is the one field name
 * with any evidence behind it and the rest of the row is unconfirmed.
 */
export type AtRiskPupil = Record<string, unknown>

export type AtRiskParams = {
  department_id: number
  session_id?: number
  semester_id?: number
}

/**
 * `GET /performance/at-risk` — a prompt to look at a child, never a decision
 * about one.
 *
 * Rule-based and fully stated: the thresholds come back in the answer, every
 * student listed comes with the figures that put them there, and the endpoint
 * sends its own `note` saying as much. A screen built on this shows the
 * thresholds beside the list, so a teacher can disagree with it — which is
 * the only way a list like this is safe to put in front of anybody.
 */
export type AtRisk = {
  scope: PerformanceScope
  pupils: AtRiskPupil[]
  /** How many students were assessed at all, so a short list can be read fairly. */
  considered: number
  thresholds: {
    pass_mark: number
    low_attendance: number
  }
  message: string | null
  /** The endpoint's own words about what this list is and is not. Shown. */
  note: string | null
}

/**
 * `GET /performance/questions/{paperId}` — which questions a class got wrong.
 *
 * A **teaching** signal, not a student one: a question two thirds of the class
 * missed says the topic needs re-teaching. An unmarked written answer is left
 * out of the rate rather than counted wrong, so the figure never punishes a
 * class for marking the teacher has not done yet.
 *
 * **Unfired** — the only reading was a 404 for a paper that does not exist,
 * so the shape is handed on whole. The paper is an assignment from
 * `src/api/set-assignments`, where a submission's id is `assignment_id`;
 * which of those two ids this route wants is itself unconfirmed.
 */
export type QuestionAnalysis = Record<string, unknown>
