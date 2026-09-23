import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Invoice } from '../../../../api/invoices/types.ts'
import type { ActivityLog } from '../../../../api/logs/types.ts'
import type { DashboardStats } from '../../../../api/users/types.ts'
import {
  activityEntries,
  activityWhen,
  collectionBars,
  compactNaira,
  financeFigures,
  ledgerTotals,
  peopleFigures,
  schoolTiles,
} from './dashboard.ts'

/** Verbatim from GET /users/dashboard. */
const STATS: DashboardStats = {
  students: 7,
  applied: 0,
  current_students: 0,
  alumni: 0,
  teachers: 4,
  subjects: 5,
  classes: 6,
  fees: 3,
  hostels: 3,
  admins: 10,
  parents: 1,
  trequests: 0,
  course_regs: 0,
  exams_count: 1,
  attendance_count: 3,
  fees_collected: 1436,
  total_revenue: 0,
}

/** Shapes as GET /invoices sends them — amounts are strings, settled is "success". */
function invoice(over: Partial<Invoice>): Invoice {
  return {
    id: 1,
    fee_id: 1,
    student_id: 10,
    session_id: 8,
    amount: '30000',
    paystatus: 'Unpaid',
    invoiceid: null,
    createdate: '2026-08-27T08:03:13+01:00',
    payday: null,
    ...over,
  }
}

const TODAY = new Date(2026, 7, 30, 9, 0)

test('the three money figures add up, because there is no part payment', () => {
  const ledger = ledgerTotals([
    invoice({ id: 1, amount: '400000' }),
    invoice({ id: 2, amount: '30000', paystatus: 'success', payday: '2026-08-27 12:56:13' }),
    invoice({ id: 3, amount: '218000', paystatus: 'success', payday: '2026-07-04 10:00:00' }),
  ])
  assert.equal(ledger.collected + ledger.outstanding, ledger.billed)
  assert.deepEqual(ledger, {
    billed: 648_000,
    collected: 248_000,
    outstanding: 400_000,
    raised: 3,
    owing: 1,
    total: 3,
  })
})

test('the register’s own count is kept, not the count of what was scanned', () => {
  // `total` is the figure the invoices page puts under "Invoices raised",
  // read off the pagination. The two screens must agree about it.
  const ledger = ledgerTotals([invoice({ id: 1, amount: '400000' })], 12_400)
  assert.equal(ledger.raised, 1)
  assert.equal(ledger.total, 12_400)
})

test('a register claiming fewer invoices than were counted off it is floored', () => {
  // Otherwise the tile reads "the newest 2 of 1 invoices".
  assert.equal(ledgerTotals([invoice({ id: 1 }), invoice({ id: 2 })], 1).total, 2)
})

test('a scan that stopped short says so rather than reading low', () => {
  const ledger = ledgerTotals(
    [
      invoice({ id: 1, amount: '400000' }),
      invoice({ id: 2, amount: '100000', paystatus: 'success', payday: '2026-08-27 12:56:13' }),
    ],
    12_400,
  )
  assert.deepEqual(
    financeFigures(ledger, [], TODAY)
      .slice(0, 3)
      .map((figure) => [figure.label, figure.amount, figure.delta]),
    [
      // The money is still the money that was counted — what changes is that
      // the tiles stop calling it the whole register.
      ['Billed to date', 500_000, 'The newest 2 of 12,400 invoices'],
      ['Collected', 100_000, '20% of those'],
      ['Outstanding', 400_000, '1 invoice of those still owing'],
    ],
  )
})

test('an unreadable amount is nothing owed rather than NaN', () => {
  const ledger = ledgerTotals([invoice({ amount: '' }), invoice({ amount: 'x' })])
  assert.equal(ledger.billed, 0)
})

test('nothing billed is a nought per cent collection rate, not a division by zero', () => {
  const figures = financeFigures(ledgerTotals([]), [], TODAY)
  assert.equal(figures[1].delta, '0% of everything billed')
  assert.equal(figures[2].hot, false)
})

test('the money figures read off the ledgers that reconcile', () => {
  const ledger = ledgerTotals([
    invoice({ id: 1, amount: '400000' }),
    invoice({ id: 2, amount: '100000', paystatus: 'success', payday: '2026-08-27 12:56:13' }),
  ])
  const figures = financeFigures(ledger, [{ month: '2026-08', total: 420_500, entries: 2 }], TODAY)
  assert.deepEqual(
    figures.map((figure) => [figure.label, figure.amount, figure.delta]),
    [
      ['Billed to date', 500_000, '2 invoices raised'],
      ['Collected', 100_000, '20% of everything billed'],
      ['Outstanding', 400_000, '1 invoice still owing'],
      ['Spent this month', 420_500, '2 entries'],
    ],
  )
  assert.equal(figures[2].hot, true)
})

test('a month with no spending recorded says so rather than showing a bare nought', () => {
  const figures = financeFigures(ledgerTotals([]), [{ month: '2026-07', total: 9000, entries: 1 }], TODAY)
  assert.equal(figures[3].amount, 0)
  assert.equal(figures[3].delta, 'Nothing recorded yet')
})

test('the people figures count what the dashboard endpoint counts', () => {
  const figures = peopleFigures(STATS)
  assert.deepEqual(
    figures.map((figure) => [figure.label, figure.amount]),
    [
      ['Students enrolled', 7],
      ['Applicants', 0],
      ['Teachers', 4],
      ['Parents', 1],
    ],
  )
  assert.equal(figures[0].delta, 'Across 6 classes')
  assert.equal(figures[2].delta, '5 subjects on the timetable')
})

test('applicants are only worth flagging while somebody is waiting', () => {
  assert.equal(peopleFigures(STATS)[1].hot, false)
  assert.equal(peopleFigures({ ...STATS, applied: 3 })[1].hot, true)
  assert.equal(peopleFigures({ ...STATS, applied: 3 })[1].delta, 'Awaiting a decision')
})

test('the school tiles carry the rest of the counters', () => {
  // Read field by field rather than whole: a tile is also a link and carries
  // an icon, and neither is what this test is about.
  assert.deepEqual(
    schoolTiles(STATS).map((tile) => [tile.label, tile.value]),
    [
      ['Classes', '6'],
      ['Subjects', '5'],
      ['Hostels', '3'],
      ['Administrators', '10'],
    ],
  )
})

test('a school tile links to its register, where the school has one', () => {
  assert.deepEqual(
    schoolTiles(STATS).map((tile) => tile.to ?? null),
    ['/admin/classes', '/admin/subjects', null, '/admin/staff-admin'],
  )
})

test('every month in the window gets a bar, including the quiet ones', () => {
  const { bars, peak } = collectionBars(
    [
      invoice({ id: 1, amount: '30000', paystatus: 'success', payday: '2026-08-27 12:56:13' }),
      invoice({ id: 2, amount: '60000', paystatus: 'success', payday: '2026-08-29 10:53:22' }),
      invoice({ id: 3, amount: '218000', paystatus: 'success', payday: '2026-06-04 10:00:00' }),
      // Owing, so no money came in — and no payday to file it under either.
      invoice({ id: 4, amount: '400000' }),
    ],
    TODAY,
  )
  assert.deepEqual(
    bars.map((bar) => [bar.label, bar.value]),
    [['Mar', 0], ['Apr', 0], ['May', 0], ['Jun', 218_000], ['Jul', 0], ['Aug', 90_000]],
  )
  assert.equal(peak, 218_000)
  assert.deepEqual(bars.filter((bar) => bar.highlight).map((bar) => bar.label), ['Jun'])
})

test('a term where nothing was collected draws flat instead of dividing by zero', () => {
  const { bars, peak } = collectionBars([invoice({ id: 1 })], TODAY)
  assert.equal(peak, 1)
  assert.equal(bars.every((bar) => bar.value === 0 && !bar.highlight), true)
})

test('a payday the API wrote years ago in prose is left out rather than guessed at', () => {
  // "24 Oct 2022 19:02 pm" does not parse, and predates any window drawn here.
  const { peak } = collectionBars(
    [invoice({ amount: '218000', paystatus: 'success', payday: '24 Oct 2022 19:02 pm' })],
    TODAY,
  )
  assert.equal(peak, 1)
})

test('a bar caption fits in a few characters at any size', () => {
  assert.equal(compactNaira(0), '₦0')
  assert.equal(compactNaira(90_000), '₦90k')
  assert.equal(compactNaira(1_325_600), '₦1.3m')
})

test('a feed says the time today, the day before by name, and the date beyond that', () => {
  assert.equal(activityWhen('2026-08-30T10:50:30+01:00', TODAY), '10:50')
  assert.equal(activityWhen('2026-08-29T16:19:34+01:00', TODAY), 'Yesterday')
  assert.match(activityWhen('2026-08-27T08:19:32+01:00', TODAY), /27 Aug/)
  assert.equal(activityWhen('not a date', TODAY), 'not a date')
})

test('the feed names the person, falls back to the title, and flags deletions', () => {
  const logs: ActivityLog[] = [
    {
      id: 321,
      title: 'Updated admin privileges',
      description: 'Set privileges for admin #1',
      timestamp: '2026-08-30T10:50:30+01:00',
      type: 'Edit',
      ip: '98.97.79.20',
      user_id: 1,
      user: 'Chukwudi Aniegboka',
      username: 'chukwudi.aniegboka@netpro.africa',
    },
    {
      id: 300,
      title: 'Deleted a fee',
      description: '',
      timestamp: '2026-08-29T16:19:34+01:00',
      type: 'Delete',
      ip: '98.97.79.20',
      user_id: 537,
      user: null,
      username: null,
    },
  ]
  assert.deepEqual(activityEntries(logs, TODAY), [
    {
      id: '321',
      text: 'Set privileges for admin #1',
      who: 'Chukwudi Aniegboka',
      when: '10:50',
      flagged: false,
    },
    {
      id: '300',
      text: 'Deleted a fee',
      who: 'User 537',
      when: 'Yesterday',
      flagged: true,
    },
  ])
})
