import type { Student } from '../../../api/students/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import { studentRow } from './student-row.ts'

/** A row for a design column, or the em dash where the record has nothing. */
function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** A filename as it is stored, or empty — an absent file is not a name. */
function file(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

/**
 * An application, as the admissions register reads it. A pupil and an
 * applicant are the same record at different points in admission, so this is
 * the pupil row under the names the applications page uses, plus the files the
 * family uploaded.
 */
export function applicantRow(student: Student): Row {
  const row = studentRow(student)
  return {
    ...row,
    ref: text(student.application_no ?? student.regno),
    applying: row.class,
    submitted: row.enrolled,
    stage: text(student.status),
    birthcert: file(student.birthcerturl),
    report: file(student.olevelresulturl),
    othercerts: file(student.othercerts),
    passport: file(student.passporturl),
  }
}

/** One document slot: what it is, and the file the family sent for it. */
export type DocumentItem = {
  key: string
  label: string
  /** How the slot reads when there is nothing to open — "Not supplied". */
  meta: string
  count: number
  /** The stored filename, empty where the slot was never filled. */
  file: string
}

const SLOTS = [
  ['birthcert', 'Birth certificate'],
  ['report', 'Last school report'],
  ['othercerts', 'Other certificates'],
  ['passport', 'Passport photograph'],
] as const

/**
 * The applicant's file, as the review page lists it. Every slot is shown —
 * what is missing is as much a part of reviewing an application as what is
 * there — with `count` marking the ones actually supplied.
 */
export function applicantDocuments(row: Row | undefined): DocumentItem[] {
  return SLOTS.map(([key, label]) => {
    const name = row?.[key] ?? ''
    return { key, label, meta: name || 'Not supplied', count: name ? 1 : 0, file: name }
  })
}
