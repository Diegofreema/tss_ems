import assert from 'node:assert/strict'
import { test } from 'node:test'
import { amountInWords } from './amount-words.ts'
import { formatCount, formatNaira, orZero, parseNaira } from './format.ts'

test('reads the figure out of a display string', () => {
  assert.equal(parseNaira('₦120,000'), 120_000)
  assert.equal(parseNaira('₦0'), 0)
  assert.equal(parseNaira('—'), 0)
})

test('spells a figure out in naira and kobo', () => {
  assert.equal(amountInWords('412000'), 'Four hundred twelve thousand naira')
  assert.equal(amountInWords('25000.5'), 'Twenty five thousand naira and fifty kobo')
  assert.equal(amountInWords('30,000'), 'Thirty thousand naira')
})

test('spells out nothing until there is a figure to spell', () => {
  // The line under an empty field is the hint; "zero naira" would replace it
  // with a reading of nothing typed yet.
  assert.equal(amountInWords(''), '')
  assert.equal(amountInWords('0'), '')
  assert.equal(amountInWords('abc'), '')
  assert.equal(amountInWords('9'.repeat(30)), '')
})

test('shows kobo only when there are kobo', () => {
  assert.equal(formatNaira(30_000), '₦30,000')
  assert.equal(formatNaira(25_000.5), '₦25,000.50')
  assert.equal(formatNaira(0), '₦0')
})

test('a figure that is not a number prints as 0, never NaN', () => {
  for (const bad of [undefined, null, Number.NaN, Infinity, 'n/a', {}]) {
    assert.equal(orZero(bad), 0)
    assert.equal(formatCount(bad as never), '0')
    assert.equal(formatNaira(bad as never), formatNaira(0))
  }
  assert.equal(orZero('12000.00'), 12000)
  assert.equal(orZero(7), 7)
  assert.equal(formatCount(1234), '1,234')
})
