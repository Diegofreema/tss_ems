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
