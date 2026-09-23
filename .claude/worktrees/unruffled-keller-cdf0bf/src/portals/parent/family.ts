import type { AttendanceRecord } from '../../api/attendance/types.ts'
import type {
  Child as EnrolledChild,
  FamilyInvoice,
} from '../../api/parents/types.ts'
import { BLANK } from '../../features/collections/blank.ts'
import { SETTLED } from '../../features/collections/invoice.ts'
import type { Row } from '../../features/collections/types.ts'
import { schoolTime, when } from '../../features/collections/when.ts'
import { formatNaira } from '../../lib/format.ts'

export { SETTLED }

/**
 * What the state column reads, named because the pay button on a row is
 * chosen by it — a literal repeated in two files is one rename from a button
 * that appears on every invoice, paid ones included.
 */
export const PAID = 'Paid'
export const OWING = 'Owing'

/**
 * The two fields a mark is read for, whichever register it came off.
 *
 * `sparents/my-children/{id}/attendance` sends `ChildMark` and
 * `admin-attendances/report` sends `AttendanceRecord`; both satisfy this, and
 * nothing below needs the pupil naming that only the second one carries.
 */
export type Mark = Pick<AttendanceRecord, 'attendance_date' | 'status'>

/** Marks that count as the child having been in school. */
const ATTENDED = ['present', 'late']

/** How many weeks the attendance chart draws. */
export const WEEKS_DRAWN = 6

/** A school week is five days. */
export const SCHOOL_WEEK = 5

/** A cell's text, or the dash the design shows where nothing is held. */
export function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/**
 * One child of the household, as every parent screen reads them.
 *
 * Who they are, what they have been billed and which days they were marked —
 * the three things read for the whole family at once. The pages that ask about
 * one child at a time, for results, attendance or assignments, read their own
 * endpoints rather than being carried on here.
 */
export type Child = {
  id: number
  /** First name, as the school entered it — used in copy. */
  name: string
  full: string
  arm: string
  /** The registration number, or a stand-in where none has been issued. */
  adm: string
  owing: number
  paid: number
  /** Days marked as attended, out of days marked at all. */
  present: number
  marked: number
  /** Attendance by week, oldest first — one entry per week drawn. */
  weeks: Week[]
  invoices: Row[]
}

/** Every part of the name the school holds, in the order it writes them. */
export function childFull(child: EnrolledChild): string {
  const name = [child.fname, child.mname, child.lname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return name || `Pupil ${child.id}`
}

/**
 * What a pupil is called in a sentence. The school enters names in whatever
 * case it likes and this does not correct it — a parent knows their own
 * child's name better than a title-caser does.
 */
export function childName(child: EnrolledChild): string {
  return child.fname?.trim() || childFull(child)
}

/**
 * One line of the child's fee ledger.
 *
 * This API settles an invoice whole — there is no part payment — so `paid` is
 * the full amount or nothing, and `balance` is the other one.
 *
 * The household's list carries no printed invoice reference, unlike the office
 * register, so the row is named by the id the API does send. It has to be
 * named by something: the number is what a bursar will ask for on the phone.
 */
export function invoiceRow(invoice: FamilyInvoice): Row {
  const amount = Number(invoice.amount) || 0
  const settled = invoice.paystatus === SETTLED

  return {
    id: String(invoice.id),
    invoice: `#${invoice.id}`,
    fee: text(invoice.fee),
    amount: formatNaira(amount),
    paid: formatNaira(settled ? amount : 0),
    balance: formatNaira(settled ? 0 : amount),
    state: settled ? PAID : OWING,

    // Read by the record panel rather than the table.
    session: text(invoice.session),
    raised: when(schoolTime(invoice.createdate)),
    settledOn: settled ? when(invoice.payday, true) : BLANK,
  }
}

/** One week of the register: days attended out of days marked at all. */
export type Week = { label: string; present: number; marked: number }

/** The Monday on or before a date, which is where a school week starts. */
function weekStart(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // getDay() is 0 on Sunday, which belongs to the week that began six days ago.
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

/**
 * Days attended per week, the last `span` weeks ending with this one.
 *
 * Every week gets an entry, including the ones with no register taken: a week
 * nobody marked is a fact about the term, and leaving it out would put the
 * wrong dates under the bars. A late mark counts as attended, which is how the
 * API's own rate counts it.
 */
export function weeksPresent(
  records: Mark[],
  today: Date,
  span = WEEKS_DRAWN,
): Week[] {
  const tally = new Map<number, { present: number; marked: number }>()
  for (const record of records) {
    const at = new Date(record.attendance_date)
    if (Number.isNaN(at.getTime())) continue
    const key = weekStart(at).getTime()
    const week = tally.get(key) ?? { present: 0, marked: 0 }
    week.marked += 1
    if (ATTENDED.includes(record.status?.toLowerCase())) week.present += 1
    tally.set(key, week)
  }

  const thisWeek = weekStart(today)
  const weeks: Week[] = []
  for (let back = span - 1; back >= 0; back -= 1) {
    const monday = new Date(thisWeek)
    monday.setDate(monday.getDate() - back * 7)
    const week = tally.get(monday.getTime())
    weeks.push({
      label: monday.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' }),
      present: week?.present ?? 0,
      marked: week?.marked ?? 0,
    })
  }
  return weeks
}

/**
 * One child, assembled from the three things the API can say about them: who
 * they are, what they have been billed, and which days they were marked.
 */
export function familyChild(
  enrolled: EnrolledChild,
  ledger: FamilyInvoice[],
  marks: Mark[],
  today: Date,
): Child {
  let owing = 0
  let paid = 0
  for (const invoice of ledger) {
    const amount = Number(invoice.amount) || 0
    if (invoice.paystatus === SETTLED) paid += amount
    else owing += amount
  }

  const full = childFull(enrolled)

  return {
    id: enrolled.id,
    name: childName(enrolled),
    full,
    arm: text(enrolled.class_arm ?? enrolled.department),
    // The school does not always issue one, and this is on screen beside the
    // name, so it says which pupil it is rather than nothing at all.
    adm: enrolled.regno?.trim() || `Pupil ${enrolled.id}`,
    owing,
    paid,
    present: marks.filter((mark) => ATTENDED.includes(mark.status?.toLowerCase())).length,
    marked: marks.length,
    weeks: weeksPresent(marks, today),
    invoices: ledger.map(invoiceRow),
  }
}

/** Everything the household still owes, across every child on the record. */
export function familyOwing(children: Child[]): number {
  return children.reduce((total, child) => total + child.owing, 0)
}
