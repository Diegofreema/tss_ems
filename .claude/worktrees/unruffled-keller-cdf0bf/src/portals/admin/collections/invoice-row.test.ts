import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Invoice } from '../../../api/invoices/types.ts'
import {
  invoiceBody,
  invoiceRow,
  payStatus,
  settleAction,
} from './invoice-row.ts'

/** Trimmed from what `GET /invoices` actually answered with. */
const settled = {
  id: 2450,
  fee_id: 1,
  student_id: 16,
  session_id: 8,
  createdate: '2026-08-27T11:34:46+01:00',
  amount: '30000',
  paystatus: 'success',
  invoiceid: 'TSS1/16',
  payday: '2026-08-27 12:56:13',
  student: {
    id: 16,
    fname: 'OKONKWO',
    lname: 'ARINZE',
    mname: 'UCHE',
    class_arm: { arm_name: 'JSS1 A' },
  },
  session: { id: 8, name: '2024/2025' },
  fee: { id: 1, name: 'TUITION FEE' },
} as unknown as Invoice

const owing = {
  ...settled,
  id: 2443,
  paystatus: 'Unpaid',
  payday: null,
  invoiceid: 'TSS1/7',
} as unknown as Invoice

test('the API speaks two vocabularies and the register speaks one', () => {
  assert.equal(payStatus('success'), 'Paid')
  assert.equal(payStatus('Unpaid'), 'Unpaid')
  // A word this API grows later is shown as sent rather than guessed at.
  assert.equal(payStatus('Reversed'), 'Reversed')
})

test('an invoice is paid in full or not at all, since settle takes no part', () => {
  assert.equal(invoiceRow(settled).paid, '₦30,000')
  assert.equal(invoiceRow(owing).paid, '₦0')
  assert.equal(invoiceRow(owing).billed, '₦30,000')
})

test('the row names the pupil, the fee and the arm the API expanded', () => {
  const row = invoiceRow(settled)
  assert.equal(row.student, 'OKONKWO UCHE ARINZE')
  assert.equal(row.fee, 'TUITION FEE')
  assert.equal(row.arm, 'JSS1 A')
  assert.equal(row.session, '2024/2025')
})

test('an invoice outliving its pupil is still listed and still named', () => {
  const orphan = { ...settled, student: undefined } as unknown as Invoice
  assert.equal(invoiceRow(orphan).student, 'Pupil 16')
  const nameless = { ...settled, student: undefined, student_id: 0 } as unknown as Invoice
  assert.equal(invoiceRow(nameless).student, 'Deleted pupil')
})

test('both date spellings this API uses come out readable', () => {
  assert.equal(invoiceRow(settled).raised, '27 Aug 2026')
  assert.match(invoiceRow(settled).settledOn, /27 Aug 2026/)
  // The older rows carry "24 Oct 2022 19:02 pm", which no Date can parse —
  // it is already readable, so it is shown rather than turned into NaN.
  const old = { ...settled, payday: '24 Oct 2022 19:02 pm' } as unknown as Invoice
  assert.equal(invoiceRow(old).settledOn, '24 Oct 2022 19:02 pm')
})

test('an unsettled invoice has no settled date to show', () => {
  assert.equal(invoiceRow(owing).settledOn, '—')
})

test('only an invoice still owing offers to be settled', () => {
  // There is no un-settle endpoint, so the button is one-way.
  assert.equal(settleAction('Unpaid'), 'Settle')
  assert.equal(settleAction('Paid'), undefined)
})

test('an invoice the API has not referenced yet is still nameable', () => {
  const unreferenced = { ...owing, invoiceid: null } as unknown as Invoice
  assert.equal(invoiceRow(unreferenced).invoice, '#2443')
})

test('the edit form gets the raw figure and the two ids', () => {
  const row = invoiceRow(settled)
  assert.equal(row.amount, '30000')
  assert.equal(row.fee_id, '1')
  assert.equal(row.student_id, '16')
})

test('an amount typed the way money reads goes as digits', () => {
  assert.equal(invoiceBody({ amount: '30,000' }).amount, '30000')
  assert.equal(invoiceBody({ amount: '' }).amount, '')
})

test('a school with no current session files the invoice under none', () => {
  // Sending zero would file it under a session that does not exist.
  assert.equal(invoiceBody({ fee_id: '1', student_id: '16' }).session_id, undefined)
  assert.equal(invoiceBody({ fee_id: '1', student_id: '16' }, 8).session_id, 8)
})

