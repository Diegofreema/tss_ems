import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Account } from '../../api/auth/types.ts'
import { accountSummary, roleLabel } from './account-summary.ts'

const login = {
  id: 518,
  username: 'teacher2@netpro.africa',
  fname: 'NETPRO2',
  lname: 'TEACHER2',
} as Account['user']

test('the name is the staff record’s, not the login’s', () => {
  const summary = accountSummary({
    user: login,
    role: { id: 3, role_name: 'Lecturer' },
    profile_type: 'teacher',
    profile: { firstname: 'Freeman', lastname: 'Eke' },
  } as Account)
  assert.equal(summary.name, 'Freeman Eke')
  assert.equal(summary.initials, 'FE')
})

test('the line is the profile type, not the role name the school renamed', () => {
  const summary = accountSummary({
    user: login,
    role: { id: 3, role_name: 'Lecturer' },
    profile_type: 'teacher',
    profile: { firstname: 'Freeman', lastname: 'Eke' },
  } as Account)
  assert.equal(summary.line, 'Teacher')
})

test('a pupil and a guardian record spell their names differently', () => {
  const pupil = accountSummary({
    user: login,
    profile_type: 'student',
    profile: { fname: 'Ada', lname: 'Eze' },
  } as Account)
  assert.equal(pupil.name, 'Ada Eze')
  assert.equal(pupil.line, 'Student')
})

test('the office record has only its two name fields, and both are used', () => {
  const admin = accountSummary({
    user: login,
    profile_type: 'admin',
    profile: { surname: 'Ngozi', lastname: 'Okafor' },
  } as Account)
  assert.equal(admin.name, 'Ngozi Okafor')
  assert.equal(admin.line, 'Admin')
})

test('a guardian is not shown as a "Sparent" whichever way the API spells it', () => {
  assert.equal(roleLabel('sparent'), 'Parent')
  assert.equal(roleLabel('parent'), 'Parent')
})

test('an underscored type reads as words', () => {
  assert.equal(roleLabel('class_teacher' as never), 'Class teacher')
})

test('a record carrying no name at all falls back to the login', () => {
  const summary = accountSummary({ user: login, profile_type: 'teacher' } as Account)
  assert.equal(summary.name, 'NETPRO2 TEACHER2')
})

test('one name is enough for both the label and the square', () => {
  const single = accountSummary({
    user: { ...login, fname: 'Amara', lname: '' },
    profile_type: 'admin',
  } as Account)
  assert.equal(single.name, 'Amara')
  assert.equal(single.initials, 'A')
})

test('an account with neither is still two letters in the square', () => {
  const summary = accountSummary({
    user: { ...login, fname: '', lname: '' },
  } as Account)
  assert.equal(summary.name, 'teacher2@netpro.africa')
  assert.equal(summary.initials, 'TE')
})
