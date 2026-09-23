import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Invoice } from '../../../../api/invoices/types.ts'
import { paidTotal } from '../fees/fees.ts'
import {
  billEntries,
  feeBars,
  studentAction,
  type StudentStats,
  studentFigures,
  studentNote,
} from './dashboard.ts'

/**
 * `GET /students/me/dashboard` for student 4. Its fee counters are the school's
 * and not this student's — four invoices with one unpaid, against a ledger of
 * three that are settled in full — and the page must not repeat them.
 */
const STATS: StudentStats = {
  invoices_total: 4,
  invoices_unpaid: 1,
  results_available: 0,
  materials_available: 0,
  fees_settled_this_session: 6,
}

/** Student 4's ledger, which is every bill the office holds against them. */
const INVOICES = [
  {
    id: 2453,
    amount: '20000',
    paystatus: 'success',
    invoiceid: 'TSS6INV4',
    createdate: '2026-08-31T07:35:40+01:00',
    payday: '2026-08-31 08:37:23',
    session: { id: 8, name: '2024/2025' },
    fee: { id: 6, name: 'Meidcal FEE' },
  },
  {
    id: 2440,
    amount: '30000',
    paystatus: 'success',
    invoiceid: 'TSS1/4',
    createdate: '2026-08-27T08:03:13+01:00',
    payday: '2026-08-27 09:23:47',
    session: { id: 8, name: '2024/2025' },
    fee: { id: 1, name: 'TUITION FEE' },
  },
  {
    id: 2441,
    amount: '30000',
    paystatus: 'success',
    invoiceid: 'TSS2/4',
    createdate: '2026-08-27T08:03:13+01:00',
    payday: '2026-08-31 08:37:55',
    session: { id: 8, name: '2024/2025' },
    fee: { id: 2, name: 'BUS FEE' },
  },
] as unknown as Invoice[]

test('the fee tiles count the student’s own bills, not the school’s counters', () => {
  const [paid, unpaid, results, materials] = studentFigures(STATS, INVOICES)
  // Field by field rather than whole: the tile also carries an icon, which is
  // not what this test is about.
  assert.equal(paid?.label, 'Paid this session')
  assert.equal(paid?.amount, 80000)
  assert.equal(paid?.format, 'naira')
  // Three settled, not the counters' six.
  assert.equal(paid?.delta, '3 invoices settled')
  assert.equal(paid?.hot, false)
  // The counters say one is unpaid. Nothing in this student's ledger is.
  assert.equal(unpaid?.amount, 0)
  assert.equal(unpaid?.delta, 'Nothing owing')
  assert.equal(unpaid?.hot, false)
  assert.equal(results?.delta, 'None approved yet')
  assert.equal(materials?.delta, 'Nothing shared yet')
})

test('a bill the student really owes is counted and flagged', () => {
  const owing = [...INVOICES, { id: 9, amount: '50000', paystatus: 'Unpaid' } as Invoice]
  const [, unpaid] = studentFigures(STATS, owing)
  assert.equal(unpaid?.amount, 1)
  assert.equal(unpaid?.delta, 'Of 4 invoices raised for you')
  assert.equal(unpaid?.hot, true)
})

test('only what a student can act on is flagged', () => {
  const cleared = studentFigures(STATS, INVOICES)
  assert.equal(cleared.filter((figure) => figure.hot).length, 0)
})

test('an unpaid bill is not counted as money taken', () => {
  const owing = [...INVOICES, { amount: '50000', paystatus: 'Unpaid' } as Invoice]
  assert.equal(paidTotal(owing), 80000)
})

const OWING = [...INVOICES, { id: 9, amount: '50000', paystatus: 'Unpaid' } as Invoice]
const OWING_TWO = [...OWING, { id: 10, amount: '1000', paystatus: 'Unpaid' } as Invoice]

test('the greeting says what is waiting, in the right number', () => {
  // Settled ledger, whatever the counters say.
  assert.match(studentNote(STATS, INVOICES), /^Every invoice raised for you/)
  assert.equal(
    studentNote(STATS, OWING),
    '1 invoice of yours is still unpaid. No result has been published to you yet.',
  )
  assert.equal(
    studentNote({ ...STATS, results_available: 3 }, OWING_TWO),
    '2 invoices of yours are still unpaid. 3 results are ready to read.',
  )
  assert.match(
    studentNote({ ...STATS, results_available: 1 }, INVOICES),
    /1 result is ready to read\.$/,
  )
})

test('the button points at whatever needs the student', () => {
  assert.deepEqual(studentAction(OWING), { to: '/student/invoices', label: 'My invoices' })
  assert.deepEqual(studentAction(INVOICES), { to: '/student/results', label: 'My results' })
})

test('the bills read newest first, each with what it was for', () => {
  const [newest] = billEntries(INVOICES)
  assert.equal(newest?.id, '2453')
  assert.equal(newest?.text, 'Meidcal FEE')
  assert.equal(newest?.who, '₦20,000 · TSS6INV4 · 2024/2025')
  assert.match(newest?.when ?? '', /^Paid 31 Aug 2026/)
  assert.equal(newest?.flagged, false)
})

test('a bill still owing is flagged and says so', () => {
  const [entry] = billEntries([
    { id: 9, amount: '50000', paystatus: 'Unpaid', invoiceid: null, createdate: null } as unknown as Invoice,
  ])
  assert.equal(entry?.text, 'Invoice 9')
  assert.equal(entry?.who, '₦50,000 · #9')
  assert.equal(entry?.when, 'Not paid')
  assert.equal(entry?.flagged, true)
})

test('each settled fee is a bar, named without the word "fee"', () => {
  const { bars, peak } = feeBars(INVOICES)
  assert.deepEqual(
    bars.map((bar) => bar.label),
    ['MEIDCAL', 'BUS', 'TUITION'],
  )
  assert.equal(bars[0]?.display, '₦20,000')
  assert.equal(peak, 30000)
})

test('nothing paid draws no bars, and never divides by zero', () => {
  const { bars, peak } = feeBars([])
  assert.deepEqual(bars, [])
  assert.equal(peak, 1)
})
