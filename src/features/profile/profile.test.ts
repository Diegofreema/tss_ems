import assert from 'node:assert/strict'
import { test } from 'node:test'
import { changePasswordSchema, profileSchema } from './schema.ts'

const fields = [
  { key: 'fullname', label: 'Full name', locked: true },
  { key: 'email', label: 'Email', required: true, email: true },
  { key: 'phone', label: 'Phone', required: true },
]

test('a locked field is never required, so a read-only profile still saves', () => {
  const result = profileSchema(fields).safeParse({ email: 'a@b.ng', phone: '0803' })
  assert.equal(result.success, true)
  assert.equal('fullname' in (result.data ?? {}), false)
})

test('editable fields are still checked', () => {
  const schema = profileSchema(fields)
  assert.equal(schema.safeParse({ email: 'nope', phone: '0803' }).success, false)
  assert.equal(schema.safeParse({ email: 'a@b.ng', phone: '  ' }).success, false)
})

test('the new password must be strong, typed twice and preceded by the old one', () => {
  const good = { current: 'whatever', next: 'Correct-Horse9', repeat: 'Correct-Horse9' }
  assert.equal(changePasswordSchema.safeParse(good).success, true)
  assert.equal(changePasswordSchema.safeParse({ ...good, repeat: 'Correct-Horse8' }).success, false)
  assert.equal(changePasswordSchema.safeParse({ ...good, next: 'short', repeat: 'short' }).success, false)
  assert.equal(changePasswordSchema.safeParse({ ...good, current: '   ' }).success, false)
})
