import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BusinessIntelligence } from '../../../../api/analytics/types.ts'
import {
  DEFAULT_LIMIT,
  LIMITS,
  admitted,
  classBars,
  enrolmentTiles,
  genderRates,
  paymentRow,
  paymentRows,
  paymentsTotal,
  pointLabel,
  pointValue,
  seriesBars,
  seriesTotal,
  sharedPeak,
  stateRows,
} from './analytics.ts'

/** Verbatim from the endpoint's own documented answer. */
const intelligence: BusinessIntelligence = {
  by_class: [{ count: 3, department_id: 1 }],
  by_gender: [{ count: 3, gender: 'Male' }],
  by_state: [{ count: 1, state_id: 2647 }],
  by_lga: [{ count: 1, lga_id: 12 }],
}

const CLASSES = new Map([
  ['1', 'JSS 1'],
  ['2', 'JSS 2'],
])
// 2647 is one past the base in `country-ids.ts`, which is Abia.
const STATES = new Map([['2647', 'Abia']])

test('the tiles count the school, not the buckets', () => {
  const tiles = enrolmentTiles(intelligence)
  assert.equal(tiles[0].value, '3')
  // One class holds all three, so the class count is 1 and the student count 3.
  assert.equal(tiles[1].value, '1')
  assert.equal(tiles[2].value, '1')
  assert.equal(tiles[3].value, '1')
})

test('an answer that never arrived still renders four tiles, at zero', () => {
  assert.deepEqual(
    enrolmentTiles(undefined).map((tile) => tile.value),
    ['0', '0', '0', '0'],
  )
})

test('admitted adds the buckets up whatever they are keyed by', () => {
  assert.equal(admitted(intelligence.by_class), 3)
  assert.equal(admitted([]), 0)
})

test('classes are named from the feed and fall back to the id', () => {
  assert.deepEqual(classBars(intelligence, CLASSES), [
    { label: 'JSS 1', value: 3, display: '3' },
  ])
  // A class the feed does not know is still a real count.
  assert.equal(classBars(intelligence, new Map())[0].label, 'Class 1')
  assert.equal(
    classBars({ ...intelligence, by_class: [{ count: 2, department_id: null }] }, CLASSES)[0]
      .label,
    'No class',
  )
})

test('classes are ordered by size, largest first', () => {
  const bars = classBars(
    {
      ...intelligence,
      by_class: [
        { count: 2, department_id: 1 },
        { count: 9, department_id: 2 },
      ],
    },
    CLASSES,
  )
  assert.deepEqual(
    bars.map((bar) => bar.label),
    ['JSS 2', 'JSS 1'],
  )
})

test('the gender split is a share of everyone counted', () => {
  assert.deepEqual(genderRates(intelligence), [
    { label: 'Male', percent: 100, amount: '3 students' },
  ])
  const mixed = genderRates({
    ...intelligence,
    by_gender: [
      { count: 3, gender: 'Male' },
      { count: 1, gender: null },
    ],
  })
  assert.deepEqual(
    mixed.map((rate) => [rate.label, rate.percent, rate.amount]),
    [
      ['Male', 75, '3 students'],
      ['Not recorded', 25, '1 student'],
    ],
  )
})

test('a state the school can name is named, and one it cannot keeps its count', () => {
  assert.deepEqual(stateRows(intelligence, STATES), [
    { id: '2647', state: 'Abia', students: '1' },
  ])
  assert.equal(stateRows(intelligence, new Map())[0].state, 'State 2647')
})

/*
 * The series readers. Every shape below is a guess by construction — see the
 * note in `analytics.ts` — so what these prove is that the reader picks the
 * label and the figure out of whatever it is handed, not that any one of
 * these shapes is the real one.
 */

test('a point is read for its label and its figure, whatever they are called', () => {
  assert.equal(pointLabel({ month: 'Jan', total: 12000 }), 'Jan')
  assert.equal(pointValue({ month: 'Jan', total: 12000 }), 12000)
  assert.equal(pointLabel({ grade: 'A', count: 4 }), 'A')
  assert.equal(pointValue({ grade: 'A', count: 4 }), 4)
})

test('an id is never mistaken for the figure', () => {
  // The one thing that would plot as a wild outlier and go unnoticed.
  assert.equal(pointValue({ session_id: 1, subject_id: 7, count: 2 }), 2)
  assert.equal(pointValue({ session_id: 44 }), 0)
})

test('an unnamed shape still reads, off its first text and first number', () => {
  assert.equal(pointLabel({ bucket: 'March', figure: '5000' }), 'March')
  assert.equal(pointValue({ bucket: 'March', figure: '5000' }), 5000)
})

test('a point with nothing readable on it does not break the chart', () => {
  assert.equal(pointLabel({}), '—')
  assert.equal(pointValue({}), 0)
  assert.equal(pointValue({ total: null }), 0)
})

test('money and tallies are written differently', () => {
  const money = seriesBars([{ month: 'Jan', total: 12000 }], true)
  assert.equal(money[0].display, '₦12,000')
  const tally = seriesBars([{ grade: 'A', count: 4 }], false)
  assert.equal(tally[0].display, '4')
  assert.deepEqual(seriesBars(undefined, true), [])
})

test('both halves of a comparison are drawn against one peak', () => {
  const current = seriesBars([{ month: 'Jan', total: 1000 }], true)
  const previous = seriesBars([{ month: 'Jan', total: 4000 }], true)
  // Scaled separately the two would draw identically, which is the one thing
  // a year-on-year chart must not do.
  assert.equal(sharedPeak(current, previous), 4000)
})

test('an empty comparison peaks at one rather than dividing by zero', () => {
  assert.equal(sharedPeak([], []), 1)
})

test('a session total adds its points up', () => {
  assert.equal(seriesTotal([{ total: 1000 }, { total: 250 }]), 1250)
  assert.equal(seriesTotal(undefined), 0)
})

/* Settled transactions. */

test('the rows are found whichever key the envelope carries them under', () => {
  assert.deepEqual(paymentRows({ payments: [{ id: 1 }] }), [{ id: 1 }])
  assert.deepEqual(paymentRows({ transactions: [{ id: 2 }] }), [{ id: 2 }])
  // Nothing named matches, but there is only ever one array on the answer.
  assert.deepEqual(paymentRows({ rows: [{ id: 3 }], total: 1 }), [{ id: 3 }])
  assert.deepEqual(paymentRows(undefined), [])
  assert.deepEqual(paymentRows({ total: 0 }), [])
})

test('a transaction reads as a reconciliation needs it', () => {
  const row = paymentRow(
    {
      id: 9,
      payment_date: '2026-08-27 11:14:00',
      student: 'Ada Obi',
      fee: 'Tuition',
      amount: '30000',
      payref: 'ISW-771',
    },
    0,
  )
  assert.equal(row.id, '9')
  assert.equal(row.payer, 'Ada Obi')
  assert.equal(row.fee, 'Tuition')
  assert.equal(row.amount, '₦30,000')
  assert.equal(row.reference, 'ISW-771')
  assert.match(row.paid, /Aug/)
})

test('a transaction missing everything still occupies one row', () => {
  // Two payments of the same amount on the same day are not one payment, so
  // the index stands in where the API sends no id.
  const row = paymentRow({}, 4)
  assert.equal(row.id, '4')
  assert.deepEqual(
    [row.paid, row.payer, row.fee, row.amount, row.reference],
    ['—', '—', '—', '—', '—'],
  )
})

test('the settled total ignores anything it cannot read as money', () => {
  assert.equal(paymentsTotal([{ amount: '30000' }, { amount: 'n/a' }, { amount: 500 }]), 30500)
  assert.equal(paymentsTotal([]), 0)
})

test('the row count the page starts on is one it offers', () => {
  // The select shows nothing at all for a default that is not on the list,
  // and the page and the catalogue are edited in different places.
  assert.ok(LIMITS.some((option) => option.value === DEFAULT_LIMIT))
  assert.ok(LIMITS.every((option) => Number(option.value) > 0))
})
