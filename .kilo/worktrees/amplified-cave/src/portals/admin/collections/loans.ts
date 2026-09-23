import { libraryService } from '@/api/library/service'
import type { Loan } from '@/api/library/types'
import type { Student } from '@/api/students/types'
import { heldRows } from '@/db/collection'
import { refLoans, refStudents } from '@/db/collections/reference'
import { pageRows } from '@/features/collections/api'
import { localFirst } from '@/features/collections/local-first'
import { newestFirst } from '@/features/collections/order'
import type { CollectionDef } from '@/features/collections/types'
import { loanRow, loanStudentId } from './loan-row'
import { keyParts, loanBorrowed } from '@/features/library/loan-read'

/**
 * The Lending page is the borrowing register, off `GET /loanedbooks` — every
 * borrowing, newest first, with issue, return, fines and corrections all here.
 * The shelf itself is the Library page next door (`./books`), where titles are
 * added and edited.
 *
 * The endpoint is not known to page or search, so the register is one set on
 * the device, searched and paged here.
 */
const allLoans = (): Promise<Loan[]> => heldRows(refLoans)

/**
 * Who each `student_id` is, off the directory the office already holds.
 *
 * `GET /loanedbooks` sends `student: null` and `regno: null` beside the id —
 * read off bronze, not assumed — so the name has to come from somewhere, and
 * the somewhere is the register of students this device keeps anyway. No
 * request, and it fills in with no connection, which the second endpoint that
 * does carry the pupil (`/admins/borrowed-books`) would not.
 */
function namesOf(students: readonly Student[]): Map<string, string> {
  const names = new Map<string, string>()
  for (const student of students) {
    const name = [student.fname, student.mname, student.lname]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (name) names.set(String(student.id), name)
  }
  return names
}

/**
 * Newest first, which this register has to state now that it is read out of a
 * keyed collection — the endpoint's own order does not survive being stored,
 * and the desk reads the day's borrowings off the top.
 */
const borrowings = (loans: readonly Loan[], students: readonly Student[] = []) => {
  const names = namesOf(students)
  return newestFirst(loans, loanBorrowed).map((loan) =>
    loanRow(loan, new Date(), names.get(loanStudentId(loan))),
  )
}

const register = async () =>
  borrowings(await allLoans(), await heldRows(refStudents).catch(() => []))

const countLoans = (standing?: string) => async () => {
  const rows = await register()
  return standing ? rows.filter((row) => row.standing === standing).length : rows.length
}

export const library: CollectionDef = {
  id: 'library',
  // Its own page beside the Library: the shelf itself is `./books`.
  path: '/admin/lending',
  kicker: 'School',
  title: 'Lending',
  description:
    'Every borrowing on record — what is out, what is late and what is owed. Issue a book from here; open a loan to take it back or collect the fine.',
  action: 'Issue a book',
  searchHint: 'Search student, title or status',
  footer: 'Every borrowing on record',
  emptyTitle: 'Nothing is out',
  emptyBody:
    'No book has been lent yet. Issue one with the button above — the loan appears here the moment it goes out.',
  noun: 'loan',
  nameKey: 'book',
  // Records arrive by lending, not by typing: returns and fines are flows on
  // the record, and the register itself cannot be added to or edited.
  readonly: true,
  counts: [
    { label: 'Borrowings', count: countLoans() },
    {
      label: 'Out now',
      count: async () =>
        (await register()).filter((row) => row.standing !== 'Returned').length,
    },
    { label: 'Overdue', count: countLoans('Overdue') },
  ],
  // `standing` stays as the key — it is the row's field and the URL's own
  // filter parameter — and only the words change.
  filters: [{ key: 'standing', label: 'Any status', options: ['Out', 'Overdue', 'Returned'] }],
  columns: [
    { key: 'student', label: 'Student', cardRole: 'title' },
    { key: 'book', label: 'Book', cardRole: 'subtitle' },
    { key: 'due', label: 'Due back' },
    { key: 'standing', label: 'Status', tag: true, cardRole: 'tag' },
    { key: 'fine', label: 'Fine', align: 'right' },
  ],
  detail: [
    { key: 'student', label: 'Student' },
    { key: 'book', label: 'Book' },
    { key: 'borrowed', label: 'Borrowed' },
    { key: 'due', label: 'Due back' },
    { key: 'standing', label: 'Status' },
    { key: 'returned_on', label: 'Returned on' },
    { key: 'condition', label: 'Condition' },
    { key: 'fine', label: 'Fine' },
    { key: 'paid', label: 'Fine status' },
    { key: 'penalty_today', label: 'Fine if returned today' },
  ],
  tabs: [],
  collection: localFirst({
    entities: refLoans,
    // The pupils behind the ids. A lookup slot rather than a second fetch:
    // the office holds the student register already.
    lookup: refStudents,
    rows: borrowings,
    // Already worked out on the rows rather than sent to the endpoint.
    narrow: (rows, filters) =>
      filters.standing ? rows.filter((row) => row.standing === filters.standing) : rows,
  }),
  source: async (params) => {
    const rows = await register()
    const standing = params.filters.standing
    return pageRows(standing ? rows.filter((row) => row.standing === standing) : rows, params)
  },
  /*
   * The record is `GET /loanedbooks/{loanId}`, the endpoint made for it, and
   * nothing else behind it. It carries the whole borrowing with
   * `penalty_if_returned_today` — the figure the desk quotes before the book
   * is on the counter.
   *
   * **That route is the desk table's alone**, and that is the school's own
   * design rather than a fault: `{{loanId}}` is a `loanedbooks` row, the two
   * tables both number from 1, and putting one table's id in the other's URL
   * "will 404" in their words. So a row from the retired assign-book screen
   * has no record endpoint at all. It is not asked for at someone else's id —
   * that would open a stranger's loan, which is worse than a blank page — and
   * nothing here reads the row off the register instead.
   *
   * What that costs, plainly: the five legacy borrowings on this school cannot
   * be opened, so their return and correction buttons cannot be reached. Every
   * loan made from now on is a desk row, because `POST /loanedbooks` is the
   * only way left to lend, and those open normally.
   */
  record: async (recordId) => {
    const { source, id } = keyParts(String(recordId))
    if (source === 'borrowedbooks') return undefined

    const loan = await libraryService.loan(id)
    const names = namesOf(await heldRows(refStudents).catch(() => []))
    return loanRow(loan, new Date(), names.get(loanStudentId(loan)))
  },
}
