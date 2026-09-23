import type { Loan } from '@/api/library/types'
import { heldRows } from '@/db/collection'
import { schoolingLoans } from '@/db/collections/schooling'
import { pageRows } from '@/features/collections/api'
import { localFirst } from '@/features/collections/local-first'
import type { CollectionDef } from '@/features/collections/types'
import { loanFine, loanPaid } from '@/features/library/loan-read'
import { formatNaira } from '@/lib/format'
import { myLoanRow } from './my-loan-row'
import { loanBorrowed } from '@/features/library/loan-read'
import { newestFirst } from '@/features/collections/order'

/**
 * The student's own borrowings, off `GET /loanedbooks/mine`.
 *
 * Read-only twice over: the desk lends and takes back, and a student's page has
 * no business offering either. The fines tile is here because it is the one
 * figure a student is asked about at the desk.
 */

/**
 * Newest first, which now has to be said rather than inherited: a collection is
 * keyed and hands its rows back in key order whatever order the endpoint sent
 * them in. The borrowing date is the one a student reads the list by, and the id
 * settles the ties — a desk that issues two books at once stamps them the same
 * day.
 */
const borrowings = (loans: readonly Loan[]) => newestFirst(loans, loanBorrowed)

const myLoans = () => heldRows(schoolingLoans).then((loans) => borrowings(loans).map((loan) => myLoanRow(loan)))

/** What is owed across every borrowing, for the tile. */
const finesOwing = async () => {
  const loans = await heldRows(schoolingLoans)
  return loans
    .filter((loan) => loanPaid(loan) === 'Owing')
    .reduce((sum, loan) => sum + loanFine(loan), 0)
}

export const library: CollectionDef = {
  id: 'library',
  path: '/student/library',
  kicker: 'Learning',
  title: 'My books',
  description:
    'Every book the library has lent you, with when each is due back. A book kept past its date gathers a fine by the day, so the date is the one to watch.',
  // No button: books are issued and taken back at the library desk.
  action: 'My books',
  readonly: true,
  searchHint: 'Search title or standing',
  footer: 'Your borrowing record, newest first',
  emptyTitle: 'No books out',
  emptyBody:
    'When the library issues a book to you at the desk, it appears here with the date it is due back. Nothing is borrowed from this page — ask at the library.',
  noun: 'loan',
  nameKey: 'book',
  counts: [
    {
      label: 'Out now',
      count: async () =>
        (await myLoans()).filter((row) => row.standing !== 'Returned').length,
    },
    {
      label: 'Overdue',
      count: async () =>
        (await myLoans()).filter((row) => row.standing === 'Overdue').length,
    },
    { label: 'Fines owing', count: finesOwing, format: formatNaira },
  ],
  tabs: [],
  columns: [
    { key: 'book', label: 'Book', cardRole: 'title' },
    { key: 'borrowed', label: 'Borrowed', cardRole: 'subtitle' },
    { key: 'due', label: 'Due back' },
    { key: 'standing', label: 'Standing', tag: true, cardRole: 'tag' },
    { key: 'fine', label: 'Fine', align: 'right' },
  ],
  detail: [
    { key: 'book', label: 'Book' },
    { key: 'borrowed', label: 'Borrowed' },
    { key: 'due', label: 'Due back' },
    { key: 'standing', label: 'Standing' },
    { key: 'returned_on', label: 'Returned on' },
    { key: 'condition', label: 'Condition' },
    { key: 'fine', label: 'Fine' },
    { key: 'paid', label: 'Fine standing' },
  ],
  collection: localFirst({
    entities: schoolingLoans,
    rows: (loans) => borrowings(loans).map((loan) => myLoanRow(loan)),
  }),
  source: (params) => myLoans().then((rows) => pageRows(rows, params)),
  record: (recordId) => myLoans().then((rows) => rows.find((row) => row.id === recordId)),
}
