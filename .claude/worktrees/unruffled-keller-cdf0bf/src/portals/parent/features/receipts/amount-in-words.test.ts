import assert from 'node:assert/strict'
import { test } from 'node:test'
import { amountInWords } from './amount-in-words.ts'

test('the design’s own example', () => {
  assert.equal(
    amountInWords(120_000),
    'One hundred and twenty thousand naira only',
  )
})

test('spells the awkward ranges', () => {
  assert.equal(amountInWords(0), 'Zero naira only')
  assert.equal(amountInWords(15), 'Fifteen naira only')
  assert.equal(amountInWords(20), 'Twenty naira only')
  assert.equal(amountInWords(45), 'Forty-five naira only')
  assert.equal(amountInWords(100), 'One hundred naira only')
  assert.equal(amountInWords(101), 'One hundred and one naira only')
  assert.equal(amountInWords(1000), 'One thousand naira only')
  assert.equal(amountInWords(28_500), 'Twenty-eight thousand five hundred naira only')
  assert.equal(amountInWords(85_000), 'Eighty-five thousand naira only')
  assert.equal(
    amountInWords(1_250_000),
    'One million two hundred and fifty thousand naira only',
  )
})

test('never spells a negative or a fraction', () => {
  assert.equal(amountInWords(-50), 'Zero naira only')
  assert.equal(amountInWords(99.9), 'Ninety-nine naira only')
})
