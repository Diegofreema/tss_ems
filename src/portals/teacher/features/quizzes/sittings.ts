import type { QuizSitting } from '../../../../api/quizzes/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import type { Row } from '../../../../features/collections/types.ts'

/**
 * Who sat a quiz, as the results tab rows it.
 *
 * **Read defensively, on purpose.** The school's document names the list —
 * "every sitting, best first" — and shows it empty, so no field of a sitting
 * has been seen. Every reader below takes the likeliest spellings, in the
 * order this API spells its other answers, and draws a dash rather than a
 * wrong figure when none is there. The one thing it is sure of is the one the
 * document states in words: `passed` is null where there is nothing to say
 * yet — an unmarked paper is not a failed one, and a quiz with no pass mark
 * has no opinion — so null is never drawn as "Failed".
 */

type Bag = Record<string, unknown>

function first(bag: Bag, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = bag[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function word(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return undefined
}

function amount(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value)
  return value !== undefined && value !== null && value !== '' && Number.isFinite(parsed)
    ? parsed
    : undefined
}

/** The pupil's name: flat, or an expanded record the way `student` sometimes is. */
function nameOf(sitting: Bag): string | undefined {
  const flat = word(first(sitting, ['student_name', 'name', 'pupil']))
  if (flat) return flat
  const student = sitting.student
  if (typeof student === 'string') return word(student)
  if (student && typeof student === 'object') {
    const record = student as Bag
    const whole = word(first(record, ['name', 'fullname']))
    if (whole) return whole
    const parts = [record.fname, record.lname].map(word).filter(Boolean)
    if (parts.length) return parts.join(' ')
  }
  return undefined
}

function regnoOf(sitting: Bag): string | undefined {
  const flat = word(first(sitting, ['regno', 'admission_no', 'adm']))
  if (flat) return flat
  const student = sitting.student
  return student && typeof student === 'object' ? word((student as Bag).regno) : undefined
}

/** Seconds, as a person reads them. */
export function duration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`
}

/** Pass, fail, or nothing to say — never "Failed" for a paper with no opinion. */
export function verdictOf(sitting: Bag): string {
  const passed = sitting.passed
  if (passed === true || passed === 1 || passed === 'true') return 'Passed'
  if (passed === false || passed === 0 || passed === 'false') return 'Failed'
  const handedIn = first(sitting, ['submitted_at', 'finished_at', 'completed_at', 'ended_at'])
  return handedIn === undefined && sitting.status === 'in_progress' ? 'Sitting now' : 'Marked'
}

export function sittingRows(sittings: readonly QuizSitting[]): Row[] {
  return sittings.map((sitting, index) => {
    const score = amount(first(sitting, ['score', 'total_score', 'marks', 'marks_scored']))
    const outOf = amount(first(sitting, ['out_of', 'total_marks', 'max_marks']))
    const percent = amount(first(sitting, ['percentage', 'percent', 'score_percent']))
    const seconds = amount(first(sitting, ['time_taken_seconds', 'seconds_taken', 'time_taken']))
    // A figure is seconds; a word is already written for a person.
    const taken =
      word(first(sitting, ['time_taken_human', 'duration'])) ??
      (seconds === undefined ? word(sitting.time_taken) : undefined)
    return {
      id: String(word(first(sitting, ['id', 'sitting_id'])) ?? index + 1),
      name: nameOf(sitting) ?? `Student ${word(sitting.student_id) ?? index + 1}`,
      adm: regnoOf(sitting) ?? BLANK,
      score:
        score === undefined ? BLANK : outOf === undefined ? String(score) : `${score} / ${outOf}`,
      percent: percent === undefined ? BLANK : `${Math.round(percent * 10) / 10}%`,
      taken: taken ?? (seconds === undefined ? BLANK : duration(seconds)),
      verdict: verdictOf(sitting),
    }
  })
}
