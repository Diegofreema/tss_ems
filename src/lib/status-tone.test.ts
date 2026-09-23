import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toneForStatus } from './status-tone.ts'

/**
 * The colour a status is painted is a claim about what it means, so the claims
 * that must not collide are the ones asserted here.
 */

test('an assignment a class can sit does not read like one it cannot', () => {
  // These two fell through to the same outline, so a register of open papers
  // and papers not yet open read as one colour down the page — which is the
  // state column's whole job undone.
  assert.notEqual(toneForStatus('Open'), toneForStatus('Not open yet'))
  assert.equal(toneForStatus('Open'), 'accent')
  assert.equal(toneForStatus('Not open yet'), 'outline')
})

test('a finished assignment is quiet, not an alarm', () => {
  assert.equal(toneForStatus('Closed'), 'neutral')
  assert.equal(toneForStatus('Inactive'), 'neutral')
})

test('an assignment nobody can sit because it holds nothing is the outstanding job', () => {
  assert.equal(toneForStatus('No questions'), 'bad')
})

test('the student’s own four states each read differently', () => {
  const tones = ['Open', 'Not open yet', 'Submitted', 'Missed'].map(toneForStatus)
  assert.equal(new Set(tones).size, 4)
})

test('a status nobody has classified is outlined rather than coloured in', () => {
  assert.equal(toneForStatus('Waiting to send'), 'outline')
})
