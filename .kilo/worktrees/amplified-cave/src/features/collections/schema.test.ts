import assert from 'node:assert/strict'
import { test } from 'node:test'
import { schemaFromSections } from './schema.ts'

const sections = [
  {
    title: 'Details',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'amount', label: 'Amount', required: true, numeric: true },
      { key: 'email', label: 'Email', email: true },
      { key: 'login', label: 'Email or username', emailOrUsername: true },
      { key: 'note', label: 'Note' },
    ],
  },
]

const schema = schemaFromSections(sections)

test('required fields reject blank and whitespace-only input', () => {
  const result = schema.safeParse({ name: '   ', amount: '100' })
  assert.equal(result.success, false)
  assert.equal(result.error?.issues.some((i) => i.path[0] === 'name'), true)
})

test('numeric fields accept the separators the design allows', () => {
  assert.equal(schema.safeParse({ name: 'Boarding', amount: '120,000.50' }).success, true)
  assert.equal(schema.safeParse({ name: 'Boarding', amount: '12k' }).success, false)
})

test('optional email is skipped when empty but checked when filled', () => {
  assert.equal(schema.safeParse({ name: 'A', amount: '1' }).success, true)
  assert.equal(schema.safeParse({ name: 'A', amount: '1', email: 'nope' }).success, false)
  assert.equal(schema.safeParse({ name: 'A', amount: '1', email: 'a@b.ng' }).success, true)
})

test('a box that takes a username takes what the school issued, address or not', () => {
  // The registration number the test student actually signs in with.
  assert.equal(schema.safeParse({ name: 'A', amount: '1', login: 'UDOYE2608264308' }).success, true)
  assert.equal(schema.safeParse({ name: 'A', amount: '1', login: 'a@b.ng' }).success, true)
  assert.equal(schema.safeParse({ name: 'A', amount: '1' }).success, true)
})

test('but an address half-typed into it is still a half-typed address', () => {
  // Nobody puts an @ in a username, so one is an address being attempted —
  // and this one bounces every invoice sent to it.
  assert.equal(schema.safeParse({ name: 'A', amount: '1', login: 'ada@gmail' }).success, false)
  assert.equal(schema.safeParse({ name: 'A', amount: '1', login: 'ada@' }).success, false)
})

const figures = schemaFromSections([
  {
    title: 'How it is sat',
    fields: [
      { key: 'minutes', label: 'Time allowed', number: true, min: 1 },
      { key: 'pass', label: 'Pass mark', number: true, min: 0, max: 100 },
    ],
  },
])

test('a number field takes a whole figure and refuses a word', () => {
  assert.equal(figures.safeParse({ minutes: '30', pass: '50' }).success, true)
  assert.equal(figures.safeParse({ minutes: 'thirty', pass: '50' }).success, false)
  // The separators a phone number is written with are not a count.
  assert.equal(figures.safeParse({ minutes: '1,20', pass: '50' }).success, false)
  assert.equal(figures.safeParse({ minutes: '30.5', pass: '50' }).success, false)
})

test('a number field holds its bounds, and says which one was missed', () => {
  assert.equal(figures.safeParse({ minutes: '0' }).success, false)
  assert.equal(figures.safeParse({ pass: '101' }).success, false)
  assert.equal(figures.safeParse({ pass: '0' }).success, true)
  assert.equal(figures.safeParse({ pass: '100' }).success, true)
  assert.equal(
    figures.safeParse({ pass: '101' }).error?.issues[0]?.message,
    'A whole number between 0 and 100',
  )
  assert.equal(
    figures.safeParse({ minutes: '0' }).error?.issues[0]?.message,
    'A whole number, at least 1',
  )
})

test('a figure nobody filled in is left alone — no limit is not zero', () => {
  assert.equal(figures.safeParse({ minutes: '', pass: '' }).success, true)
  assert.equal(figures.safeParse({}).success, true)
})

const windowed = schemaFromSections([
  {
    title: 'When it can be sat',
    fields: [
      { key: 'opens_at', label: 'Opens', datetime: true },
      { key: 'closes_at', label: 'Closes', datetime: true, after: 'opens_at' },
    ],
  },
])

test('a window that shuts before it opens is refused', () => {
  const bad = windowed.safeParse({
    opens_at: '2026-09-23T10:00',
    closes_at: '2026-09-23T09:00',
  })
  assert.equal(bad.success, false)
  const issue = bad.error?.issues.find((one) => one.path[0] === 'closes_at')
  // Named from the other field's own label, so the message reads in the form's
  // words rather than in a key.
  assert.equal(issue?.message, 'Must be after opens')
})

test('a window that shuts at the moment it opens is refused too', () => {
  const same = '2026-09-23T10:00'
  assert.equal(windowed.safeParse({ opens_at: same, closes_at: same }).success, false)
})

test('a window in the right order is taken', () => {
  assert.equal(
    windowed.safeParse({ opens_at: '2026-09-21T08:00', closes_at: '2026-09-23T09:00' }).success,
    true,
  )
})

test('either end left open has nothing to be out of order with', () => {
  assert.equal(windowed.safeParse({ opens_at: '', closes_at: '2026-09-23T09:00' }).success, true)
  assert.equal(windowed.safeParse({ opens_at: '2026-09-21T08:00', closes_at: '' }).success, true)
  assert.equal(windowed.safeParse({ opens_at: '', closes_at: '' }).success, true)
})

test('something the picker could not have produced is refused', () => {
  assert.equal(
    windowed.safeParse({ opens_at: '23/09/2026 08:00', closes_at: '' }).success,
    false,
  )
})
