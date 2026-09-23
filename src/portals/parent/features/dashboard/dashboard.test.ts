import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Child } from '../../family.ts'
import { attendanceBarsFor, figuresFor, queueFor } from './dashboard.ts'

function child(over: Partial<Child>): Child {
  return {
    id: 4,
    name: 'UDOYE',
    full: 'UDOYE OZOMGBO OKIGBO',
    arm: 'JSS 2 A',
    adm: 'CUN/2026/4',
    owing: 0,
    paid: 0,
    present: 0,
    marked: 0,
    weeks: [],
    invoices: [],
    ...over,
  }
}

const OWING = {
  id: '2441',
  invoice: '#2441',
  fee: 'BUS FEE',
  amount: '₦30,000',
  paid: '₦0',
  balance: '₦30,000',
  state: 'Owing',
  session: '2024/2025',
  raised: '27 Aug 2026',
  settledOn: '—',
}
const PAID = { ...OWING, id: '2440', invoice: '#2440', state: 'Paid', balance: '₦0', paid: '₦30,000' }

test('the figures are money the ledgers agree on, and the register as it stands', () => {
  const one = child({ owing: 30_000, paid: 30_000, invoices: [OWING, PAID], present: 1, marked: 2 })
  const two = child({ id: 7, name: 'NDIDI', owing: 5_500 })
  const figures = figuresFor(one, [one, two])

  assert.deepEqual(
    figures.map((figure) => [figure.label, figure.amount, figure.delta]),
    [
      ['Owing for UDOYE', 30_000, '1 invoice unpaid'],
      ['Family total owing', 35_500, '2 children owe'],
      ['Paid for UDOYE', 30_000, '1 invoice settled'],
      ['Days present', 1, 'of 2 days marked'],
    ],
  )
  // A day missed is worth flagging; money owed always is.
  assert.deepEqual(figures.map((figure) => figure.hot), [true, true, false, true])
})

test('a child nobody has marked says so rather than reading nought per cent', () => {
  const figures = figuresFor(child({}), [child({})])
  assert.equal(figures[3].delta, 'No register taken yet')
  assert.equal(figures[3].hot, false)
})

test('a household that owes nothing is not flagged for it', () => {
  const clear = child({ invoices: [PAID], paid: 30_000 })
  const figures = figuresFor(clear, [clear])
  assert.equal(figures[0].delta, 'Nothing outstanding')
  assert.equal(figures[0].hot, false)
  assert.equal(figures[1].delta, '0 children owe')
})

test('a week is drawn against the days marked in it, not against five', () => {
  const { bars, peak } = attendanceBarsFor(
    child({
      weeks: [
        { label: '20 Jul', present: 0, marked: 0 },
        { label: '24 Aug', present: 1, marked: 2 },
      ],
    }),
  )
  assert.deepEqual(bars, [
    { label: '20 Jul', value: 0, display: '—', highlight: false },
    { label: '24 Aug', value: 1, display: '1/2', highlight: true },
  ])
  // A week nobody marked is not the child's fault and is not flagged as one.
  assert.equal(peak, 5)
})

test('a week with more marks than a school week still fits the chart', () => {
  const { peak } = attendanceBarsFor(
    child({ weeks: [{ label: '24 Aug', present: 6, marked: 7 }] }),
  )
  assert.equal(peak, 7)
})

test('the queue is every invoice still owing, across the family, largest first', () => {
  const one = child({ invoices: [OWING, PAID] })
  const two = child({
    id: 7,
    name: 'NDIDI',
    invoices: [{ ...OWING, id: '36', invoice: '#36', balance: '₦95,000', session: '—' }],
  })
  const queue = queueFor([one, two])

  assert.deepEqual(
    queue.items.map((item) => item.title),
    ['₦95,000 outstanding for NDIDI', '₦30,000 outstanding for UDOYE'],
  )
  assert.equal(queue.total, 2)
  assert.equal(queue.items[1].detail, 'BUS FEE · #2441 · 2024/2025')
  assert.equal(queue.items[0].to, '/parent/pay')
  // Two children can hold invoices with the same row id in their own lists.
  assert.equal(new Set(queue.items.map((item) => item.id)).size, queue.items.length)
})

test('a household years behind is summarised rather than listed in full', () => {
  const many = child({
    invoices: Array.from({ length: 9 }, (_, index) => ({
      ...OWING,
      id: String(index),
      invoice: `#${index}`,
      balance: `₦${(index + 1) * 1_000}`,
    })),
  })
  const queue = queueFor([many], 6)

  // Six bills and one line saying what was left out — never a silent cut.
  assert.equal(queue.items.length, 7)
  assert.equal(queue.total, 9)
  assert.equal(queue.items[6].title, '3 older bills not listed here')
  assert.equal(queue.items[6].detail, '₦6,000 between them')
  assert.equal(queue.items[6].to, '/parent/invoices')
  assert.equal(queue.items[6].urgent, false)
})

test('a single overflowing bill is counted in the singular', () => {
  const many = child({
    invoices: Array.from({ length: 7 }, (_, index) => ({
      ...OWING,
      id: String(index),
      balance: `₦${(index + 1) * 1_000}`,
    })),
  })
  assert.equal(queueFor([many], 6).items[6].title, '1 older bill not listed here')
})

test('a family that owes nothing has an empty queue, not a made-up one', () => {
  assert.deepEqual(queueFor([child({ invoices: [PAID] })]), { items: [], total: 0 })
})
