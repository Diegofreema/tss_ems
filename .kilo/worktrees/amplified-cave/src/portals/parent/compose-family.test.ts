import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Child as EnrolledChild, FamilyInvoice } from '../../api/parents/types.ts'
import { SETTLED, composeFamily, type OwnedMark } from './family.ts'

const TODAY = new Date('2026-05-12T09:00:00+01:00')

const enrolled = (id: number, fname: string): EnrolledChild =>
  ({ id, fname, lname: 'Okafor', regno: `ADM/${id}`, class_arm: 'JSS 3B' }) as EnrolledChild

const invoice = (id: number, studentId: number, amount: string, paid: boolean): FamilyInvoice =>
  // `SETTLED` is the school's own word for a paid bill, and it is not
  // "paid" — reading it off the source is the point of importing it.
  ({ id, student_id: studentId, amount, paystatus: paid ? SETTLED : 'pending' }) as FamilyInvoice

const mark = (childId: number, day: string, status: string): OwnedMark => ({
  childId,
  attendance_date: day,
  status,
})

test('each child gets only their own bills and their own marks', () => {
  const family = composeFamily(
    [enrolled(1, 'Ada'), enrolled(2, 'Chidi')],
    [invoice(10, 1, '5000', false), invoice(11, 2, '3000', true), invoice(12, 1, '2000', true)],
    [mark(1, '2026-05-11', 'present'), mark(2, '2026-05-11', 'absent')],
    TODAY,
  )

  assert.equal(family.length, 2)
  assert.equal(family[0].owing, 5000)
  assert.equal(family[0].paid, 2000)
  assert.equal(family[0].marked, 1)
  assert.equal(family[0].present, 1)

  assert.equal(family[1].owing, 0)
  assert.equal(family[1].paid, 3000)
  assert.equal(family[1].present, 0, 'an absence is not an attendance')
})

test('a child with nothing billed and nothing marked still appears', () => {
  // The switcher has to list them, or a guardian cannot reach their pages.
  const family = composeFamily([enrolled(3, 'Ngozi')], [], [], TODAY)
  assert.equal(family.length, 1)
  assert.equal(family[0].owing, 0)
  assert.equal(family[0].marked, 0)
})

test('marks belonging to nobody on the record are ignored', () => {
  const family = composeFamily([enrolled(1, 'Ada')], [], [mark(99, '2026-05-11', 'present')], TODAY)
  assert.equal(family[0].marked, 0)
})

test('an empty household composes to an empty list, not a crash', () => {
  assert.deepEqual(composeFamily([], [invoice(1, 1, '10', false)], [], TODAY), [])
})
