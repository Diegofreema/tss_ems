import type { QuizBody } from '../../../api/quizzes/types.ts'
import { toSchoolStamp } from '../../../features/collections/when.ts'

/**
 * What the quiz form submits, in the school's own words for each field —
 * `quizname` for the name, `duration` for the clock, `pass_mark` for what the
 * answer calls `pass_mark_percent`.
 *
 * The window goes as `YYYY-MM-DD HH:MM:SS` with no zone (`toSchoolStamp`).
 * The school runs both dates through `strtotime()`, and the document's own
 * example shows why the shape matters: `02/10/2026` went in and came back as
 * the 10th of February. Nothing reads `2026-10-02 08:00:00` two ways.
 */

/** A figure left blank is null — the school's own "no clock", "no pass mark". */
function figure(value: unknown): number | null {
  const digits = String(value ?? '').replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

/** The whole body, as a quiz nobody has sat takes it. */
function wholeBody(values: Record<string, unknown>): QuizBody {
  return {
    quizname: String(values.name ?? '').trim(),
    subject_id: Number(values.subject_id),
    department_id: Number(values.department_id),
    // Empty is every arm of the class — the ordinary case, not a gap.
    class_arm_id: figure(values.class_arm_id),
    description: String(values.description ?? '').trim(),
    duration: figure(values.duration),
    pass_mark: figure(values.pass_mark),
    // Blank asks every question written.
    total_questions: figure(values.total_questions),
    shuffle_questions: values.shuffled === 'yes',
    start_date: toSchoolStamp(String(values.opens_at ?? '')),
    end_date: toSchoolStamp(String(values.closes_at ?? '')),
  }
}

/**
 * What still moves once a pupil has sat the quiz. The subject, class, arm,
 * clock and pass mark are the record of what was asked and are refused with a
 * 409; the name, description and closing date are not.
 */
export const EDITABLE_WHEN_SAT = ['quizname', 'description', 'end_date'] as const

export function quizBody(
  values: Record<string, unknown>,
  /** True once anybody has sat it, which narrows what goes. */
  sat = false,
): QuizBody {
  const whole = wholeBody(values)
  if (!sat) return whole
  // Sending the rest would be refused wholesale — for changing a pass mark
  // the teacher moving a deadline never touched.
  const narrowed: QuizBody = {}
  for (const key of EDITABLE_WHEN_SAT) {
    ;(narrowed as Record<string, unknown>)[key] = whole[key]
  }
  return narrowed
}
