import test from 'node:test'
import assert from 'node:assert/strict'
import { hasText, isRichText, plainText } from './rich-text.ts'

test('reads the words out of the markup', () => {
  assert.equal(plainText('<p>Quadratic <strong>equations</strong></p>'), 'Quadratic equations')
})

test('keeps two blocks apart', () => {
  assert.equal(plainText('<p>One</p><p>Two</p>'), 'One Two')
})

test('decodes the entities the editor writes', () => {
  assert.equal(plainText('<p>Fractions &amp; surds&nbsp;&#39;09</p>'), "Fractions & surds '09")
})

test('an emptied editor holds no text', () => {
  // What tiptap hands back once the last character is deleted.
  assert.equal(hasText('<p></p>'), false)
  assert.equal(hasText('<p><br></p>'), false)
  assert.equal(hasText(''), false)
})

test('a filled one does', () => {
  assert.equal(hasText('<h2>Week 3</h2>'), true)
})

test('markup is told apart from the plain sentence beside it in the same field', () => {
  assert.equal(isRichText('<p>Answer <strong>all</strong> questions.</p>'), true)
  assert.equal(isRichText('Answer all questions.'), false)
  // Arithmetic a teacher typed, not a tag.
  assert.equal(isRichText('Show that 3 < 5 and 5 > 3.'), false)
  assert.equal(isRichText(''), false)
})
