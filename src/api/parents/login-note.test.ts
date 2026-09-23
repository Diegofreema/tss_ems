import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loginNote } from './login-note.ts'

/*
 * The one thing the school says once and never again. A household created with
 * no connection gets its answer from the drain, so this sentence has to survive
 * being read back off a queued op's response rather than off a form's.
 */
test('the note carries both halves of the sign-in', () => {
  const note = loginNote({ username: 'okafor01', password: 'Tuesday44' })
  assert.ok(note?.includes('okafor01'))
  assert.ok(note?.includes('Tuesday44'))
})

test('an answer missing either half says nothing at all', () => {
  assert.equal(loginNote({ username: 'okafor01' }), undefined)
  assert.equal(loginNote({ password: 'Tuesday44' }), undefined)
  assert.equal(loginNote({ username: '  ', password: 'x' }), undefined)
  assert.equal(loginNote({}), undefined)
  assert.equal(loginNote(null), undefined)
  assert.equal(loginNote('nonsense'), undefined)
})
