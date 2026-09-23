import type {
  SearchKind,
  SearchRegister,
  SearchResults,
  SearchRow,
} from '../../../../api/search/types.ts'

/**
 * Reading the office's one search box.
 *
 * Almost nothing here is a guess — this is the only one of the three new
 * families read off a live, populated answer — so this module is about telling
 * two silences apart rather than about shapes.
 */

/** One register's worth of the answer, and whether it was even looked in. */
export type Group = {
  register: SearchRegister
  /** What the office calls these people. */
  heading: string
  rows: SearchRow[]
  /** The real total, which may be larger than `rows` where `limit` cut it. */
  total: number
  /** False where the caller's privileges kept this register out of the search. */
  searched: boolean
  /** Where a row of this kind opens, as a route path prefix. */
  to: string
}

const REGISTERS: {
  register: SearchRegister
  heading: string
  kind: SearchKind
  to: string
}[] = [
  { register: 'students', heading: 'Students', kind: 'student', to: '/admin/students' },
  { register: 'parents', heading: 'Guardians', kind: 'parent', to: '/admin/parents' },
  { register: 'teachers', heading: 'Staff', kind: 'teacher', to: '/admin/staff-teachers' },
]

/**
 * The three registers in a fixed order, each carrying whether it was actually
 * searched.
 *
 * That flag is the whole point. An empty `students` list means nobody called
 * that; `students` missing from `searched` means the caller lacks the Student
 * privilege — which gates Students *and* Sparents together. A screen that
 * showed both as "no results" would tell an administrator the school has no
 * such student when it may well have one.
 */
export function groups(data: SearchResults | undefined): Group[] {
  const searched = data?.searched ?? []
  return REGISTERS.map((entry) => ({
    register: entry.register,
    heading: entry.heading,
    rows: rowsOf(data, entry.register),
    total: data?.counts?.[entry.register] ?? 0,
    searched: searched.includes(entry.register),
    to: entry.to,
  }))
}

function rowsOf(
  data: SearchResults | undefined,
  register: SearchRegister,
): SearchRow[] {
  const rows = data?.[register]
  return Array.isArray(rows) ? rows : []
}

/**
 * What a group's count line says.
 *
 * A list cut to `limit` under a real total of forty has to say so: "10 of 40"
 * rather than a bare ten, which reads as all there is and sends somebody away
 * believing the register holds nobody else.
 */
export function countLine(group: Group): string {
  if (!group.searched) return 'not searched'
  if (group.total === 0) return 'none'
  if (group.rows.length < group.total) {
    return `showing ${group.rows.length} of ${group.total}`
  }
  return String(group.total)
}

/** Whether the term is long enough for the school to look anything up. */
export const MIN_TERM = 2

export function tooShort(term: string): boolean {
  return term.trim().length > 0 && term.trim().length < MIN_TERM
}

/**
 * The line above the results.
 *
 * Composed from `counts` rather than taken from the envelope's own `message`:
 * `request()` unwraps the envelope and the message with it, and this says the
 * same thing off the same figures.
 */
export function summary(data: SearchResults | undefined, term: string): string {
  if (!data) return ''
  const parts = groups(data)
    .filter((group) => group.searched && group.total > 0)
    .map((group) => `${group.total} ${plural(group.register, group.total)}`)
  if (!parts.length) return `Nothing matches “${term}”.`
  return `${parts.join(', ')} matching “${term}”.`
}

function plural(register: SearchRegister, count: number): string {
  const one = count === 1
  if (register === 'students') return one ? 'student' : 'students'
  if (register === 'parents') return one ? 'guardian' : 'guardians'
  return one ? 'staff record' : 'staff records'
}
