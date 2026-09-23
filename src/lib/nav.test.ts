import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isPortalHome } from './nav.ts'

test('a portal home is matched exactly and everything under it is not', () => {
  assert.equal(isPortalHome('/admin'), true)
  assert.equal(isPortalHome('/teacher'), true)
  assert.equal(isPortalHome('/admin/notifications'), false)
  // A record page keeps its own section lit, which is why only the home is
  // exact and everything else still matches by prefix.
  assert.equal(isPortalHome('/admin/collect/report'), false)
})

test('a trailing slash does not make a section look like a home', () => {
  assert.equal(isPortalHome('/admin/students/'), false)
  assert.equal(isPortalHome('/admin/'), true)
})
