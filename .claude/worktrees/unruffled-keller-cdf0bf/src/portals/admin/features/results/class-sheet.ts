import type { ClassSheet } from '../../../../api/results/types.ts'
import { BLANK } from '../../../../features/collections/blank.ts'
import {
  looseId,
  looseNumber,
  looseText,
  pick,
} from '../../../../features/collections/loose.ts'

/**
 * The broadsheet: every pupil in a class against every subject.
 *
 * **Position is computed by the server on every request, never stored** — it
 * depends on every other pupil's marks, so a stored copy is wrong the moment
 * one of them changes. Ties share a place. Nothing here recomputes it: a
 * second opinion about who came first is the last thing a school needs.
 *
 * **The response shape is unverified.** `GET /results/class-sheet` has not
 * been read with a class on it, so this reads the answer for the shape rather
 * than for named keys: the pupils are whichever array it carries, and a
 * pupil's subject marks are whichever array or map sits on their row. That is
 * the whole guess, in this file, under test.
 */

type Loose = Record<string, unknown>

export type SheetColumn = { key: string; label: string }

export type SheetRow = {
  id: string
  pupil: string
  adm: string
  /** Keyed by `SheetColumn.key`; a subject the pupil has no mark in is absent. */
  marks: Record<string, string>
  total: string
  average: string
  position: string
}

export type Sheet = { columns: SheetColumn[]; rows: SheetRow[] }

const PUPIL_LISTS = ['students', 'pupils', 'sheet', 'rows', 'results', 'items', 'data']
const SUBJECT_LISTS = ['subjects', 'marks', 'results', 'scores', 'grades']

function isRecord(value: unknown): value is Loose {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** The array of pupils, whichever key carries it. */
function pupilsOf(answer: ClassSheet | undefined): Loose[] {
  if (!answer) return []
  for (const key of PUPIL_LISTS) {
    const value = (answer as Loose)[key]
    if (Array.isArray(value) && value.every(isRecord)) return value as Loose[]
  }
  const found = Object.values(answer as Loose).find(
    (value) => Array.isArray(value) && value.length > 0 && value.every(isRecord),
  )
  return (found as Loose[] | undefined) ?? []
}

/** Every part of the name the sheet holds, however it was nested. */
export function sheetPupil(row: Loose): string {
  const pupil = isRecord(row.student) ? row.student : row
  const named = ['fname', 'mname', 'lname']
    .map((part) => pupil[part])
    .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
    .join(' ')
    .trim()
  if (named) return named
  const single = pick(pupil, 'name', 'fullname', 'student_name')
  if (single !== undefined) return looseText(single)
  return looseText(pick(pupil, 'regno', 'id'))
}

/** A figure as a broadsheet reads it — whole marks, and a blank for no mark. */
export function figure(value: unknown): string {
  if (value === undefined || value === null || value === '') return BLANK
  const parsed = looseNumber(value)
  return parsed === undefined ? looseText(value) : String(Math.round(parsed * 100) / 100)
}

/** The subject entries on one pupil's row, as an array whichever way they came. */
function subjectsOf(row: Loose): Loose[] {
  for (const key of SUBJECT_LISTS) {
    const value = row[key]
    if (Array.isArray(value) && value.every(isRecord)) return value as Loose[]
    // A map keyed by subject rather than a list — "MATHEMATICS": 72.
    if (isRecord(value)) {
      return Object.entries(value).map(([label, mark]) =>
        isRecord(mark) ? { name: label, ...mark } : { name: label, total: mark },
      )
    }
  }
  return []
}

/** How a subject is identified across rows: its id where it has one. */
function columnOf(entry: Loose): SheetColumn {
  const label = looseText(pick(entry, 'subject_name', 'subject', 'name', 'code'))
  const id = looseId(pick(entry, 'subject_id', 'subject'))
  return { key: id === undefined ? label : String(id), label }
}

/**
 * The subject columns, in the order the sheet first mentions them.
 *
 * Taken across every pupil rather than off the first: a pupil with no mark in
 * a subject may not carry it at all, and a column missing because the first
 * child on the register happened to miss that test would silently drop a
 * whole subject from the broadsheet.
 */
export function sheetColumns(answer: ClassSheet | undefined): SheetColumn[] {
  const named = (answer as Loose | undefined)?.subjects
  const columns = new Map<string, SheetColumn>()

  if (Array.isArray(named) && named.every(isRecord)) {
    for (const entry of named as Loose[]) {
      const column = columnOf(entry)
      if (column.label !== BLANK) columns.set(column.key, column)
    }
  }

  for (const row of pupilsOf(answer)) {
    for (const entry of subjectsOf(row)) {
      const column = columnOf(entry)
      if (column.label !== BLANK && !columns.has(column.key)) columns.set(column.key, column)
    }
  }

  return [...columns.values()]
}

export function sheetRow(row: Loose, index: number): SheetRow {
  const marks: Record<string, string> = {}
  for (const entry of subjectsOf(row)) {
    const { key } = columnOf(entry)
    // `total` first: a subject's figure on a broadsheet is what it came to,
    // not one of the parts behind it.
    marks[key] = figure(pick(entry, 'total', 'score', 'mark', 'value'))
  }

  const pupil = isRecord(row.student) ? row.student : row

  return {
    id: looseText(pick(pupil, 'student_id', 'id')) === BLANK
      ? String(index)
      : looseText(pick(pupil, 'student_id', 'id')),
    pupil: sheetPupil(row),
    adm: looseText(pick(pupil, 'regno', 'admission_no')),
    marks,
    total: figure(pick(row, 'total', 'total_marks', 'grand_total')),
    average: figure(pick(row, 'average', 'avg', 'mean')),
    // Never recomputed — see the note at the top of this file.
    position: looseText(pick(row, 'position', 'rank', 'place')),
  }
}

export function classSheet(answer: ClassSheet | undefined): Sheet {
  return {
    columns: sheetColumns(answer),
    rows: pupilsOf(answer).map(sheetRow),
  }
}

/** What the office is looking at, named above the sheet. */
export function sheetCaption(answer: ClassSheet | undefined): string {
  const parts = [
    looseText(pick(answer as Loose | undefined, 'department', 'department_name', 'class')),
    looseText(pick(answer as Loose | undefined, 'class_arm', 'class_arm_name', 'arm')),
    looseText(pick(answer as Loose | undefined, 'semester', 'semester_name', 'term')),
    looseText(pick(answer as Loose | undefined, 'session', 'session_name')),
  ].filter((part) => part !== BLANK)
  return parts.join(' · ')
}
