import assert from 'node:assert/strict'
import { methodLabel, methodOptions } from '../../../features/collections/payment-methods.ts'
import { test } from 'node:test'
import type { CollectInvoice, Transaction } from '../../../api/collect-fees/types.ts'
import {
  collecting,
  collectRow,
  payAction,
  paymentBody,
  studentName,
  reportPaymentRow,
  transactionRow,
} from './collect-row.ts'

/** Verbatim from GET /collect-fees. */
const owing: CollectInvoice = {
  id: 2441,
  student_id: 4,
  student: {
    id: 4,
    regno: 'CUN/2026/4',
    name: 'UDOYE OKIGBO',
    department: 'JSS II',
    class_arm: 'JSS 2 A',
  },
  fee: 'BUS FEE',
  session: '2024/2025',
  amount: 30000,
  paystatus: 'Unpaid',
  is_settled: false,
  payday: null,
  createdate: '2026-08-27T08:03:13+00:00',
}

/** Verbatim from GET /collect-fees/2440. */
const paid: CollectInvoice = {
  ...owing,
  id: 2440,
  fee: 'TUITION FEE',
  paystatus: 'success',
  is_settled: true,
  payday: '2026-08-27 09:23:47',
  transactions: [
    {
      id: 16,
      payref: 'MANUAL_CASH_20260827092347_1',
      amount: 30000,
      discount: 0,
      paystatus: 'success',
      method: 'cash',
      notes: 'payment collected by chukwudi',
      recorded_by: 1,
      transdate: '2026-08-27T09:23:47+01:00',
      invoice_id: 2440,
    },
  ],
}

const METHODS = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  pos: 'POS',
  cheque: 'Cheque',
}

test('the queue reads the student, the class arm and what is owed', () => {
  const row = collectRow(owing)
  assert.equal(row.id, '2441')
  assert.equal(row.invoice, '#2441')
  assert.equal(row.student, 'UDOYE OKIGBO')
  assert.equal(row.regno, 'CUN/2026/4')
  assert.equal(row.placed, 'JSS 2 A')
  assert.equal(row.fee, 'BUS FEE')
  assert.equal(row.billed, '₦30,000')
  assert.equal(row.status, 'Owing')
  assert.equal(row.student_id, '4')
  // The figure itself, for the flow's arithmetic — a naira sign would not add up.
  assert.equal(row.total, '30000')
})

test('a bare payday and an ISO transdate name the same minute', () => {
  // `payday` carries no zone and `transdate` carries the school's own, and
  // both hold the same wall clock. Reading either as UTC would put the same
  // payment an hour out from itself.
  assert.equal(collectRow(paid).settledOn, transactionRow(paid.transactions![0]).taken)
})

test('is_settled decides the status, not the gateway word', () => {
  assert.equal(collectRow(paid).status, 'Paid')
  assert.equal(collectRow(paid).settledOn, '27 Aug 2026, 09:23')
  assert.equal(collectRow(paid).collected, '₦30,000')
  // The queue sends no transactions, so nothing is claimed about what was paid.
  assert.equal(collectRow(owing).collected, '—')
})

test('a student is named whichever way the endpoint spelled them', () => {
  assert.equal(studentName({ id: 4, regno: null, name: 'UDOYE OKIGBO', department: null }), 'UDOYE OKIGBO')
  assert.equal(
    studentName({ id: 4, regno: null, fname: 'UDOYE', lname: 'OKIGBO', department: null }),
    'UDOYE OKIGBO',
  )
  // The queue really does send `"student": null` against a live invoice.
  assert.equal(studentName(null, 90), 'Student 90')
  assert.equal(studentName(null), 'Deleted student')
})

test('payment is offered on an invoice still owing and on no other', () => {
  // A second payment is refused with 409, so a settled row gets no button.
  assert.equal(payAction(collectRow(owing)), true)
  assert.equal(payAction(collectRow(paid)), false)
  assert.equal(payAction(undefined), false)
})

test('the amount is derived from the discount, never typed', () => {
  // amount + discount must equal the invoice exactly.
  assert.deepEqual(collecting(30_000, '6,000'), { amount: 24_000, discount: 6_000 })
  assert.deepEqual(collecting(30_000, ''), { amount: 30_000, discount: 0 })
  assert.deepEqual(collecting(30_000, '0'), { amount: 30_000, discount: 0 })
})

test('a discount cannot be worth more than the bill it is against', () => {
  assert.deepEqual(collecting(30_000, '90,000'), { amount: 0, discount: 30_000 })
  assert.deepEqual(collecting(30_000, '-500'), { amount: 30_000, discount: 0 })
  assert.deepEqual(collecting(30_000, 'abc'), { amount: 30_000, discount: 0 })
})

test('the body is the one the endpoint documented', () => {
  assert.deepEqual(
    paymentBody(30_000, {
      discount: '6,000',
      payment_method: 'bank_transfer',
      notes: 'Transfer ref 99881',
    }),
    { amount: '24000', discount: 6000, payment_method: 'bank_transfer', notes: 'Transfer ref 99881' },
  )
})

test('an empty note is left off rather than sent blank', () => {
  const body = paymentBody(30_000, { discount: '', payment_method: 'cash', notes: '   ' })
  assert.equal('notes' in body, false)
  assert.deepEqual(body, { amount: '30000', discount: 0, payment_method: 'cash' })
})

test('a method is named by the API, or shown as it was sent', () => {
  assert.equal(methodLabel('bank_transfer', METHODS), 'Bank Transfer')
  // A method the API grows later, or one read before the list has loaded.
  assert.equal(methodLabel('crypto', METHODS), 'crypto')
  assert.equal(methodLabel('cash', undefined), 'cash')
  assert.equal(methodLabel(null), '—')
  assert.deepEqual(methodOptions(METHODS)[1], { value: 'bank_transfer', label: 'Bank Transfer' })
})

test('a payment already taken reads with its reference', () => {
  const row = transactionRow(paid.transactions![0], METHODS)
  assert.equal(row.taken, '27 Aug 2026, 09:23')
  assert.equal(row.method, 'Cash')
  assert.equal(row.amount, '₦30,000')
  assert.equal(row.discount, '₦0')
  assert.equal(row.payref, 'MANUAL_CASH_20260827092347_1')
})

test('the pay response dates a transaction differently, and it still reads', () => {
  // POST /pay sends `transdate` as its parts; everywhere else it is a string.
  const entry = {
    ...paid.transactions![0],
    transdate: { date: '2026-08-27 12:56:13.862430' },
  } as Transaction
  assert.equal(transactionRow(entry, METHODS).taken, '27 Aug 2026, 12:56')
})

test('a payment in the report names the student and the invoice', () => {
  const row = reportPaymentRow(
    {
      ...paid.transactions![0],
      id: 17,
      method: 'bank_transfer',
      amount: 24_000,
      discount: 6_000,
      invoice_id: 2450,
      student: { id: 16, regno: 'NETPRO/2026/16', name: 'OKONKWO ARINZE', department: 'JSS 1' },
      fee: 'TUITION FEE',
    },
    METHODS,
  )
  assert.equal(row.student, 'OKONKWO ARINZE')
  assert.equal(row.fee, 'TUITION FEE')
  assert.equal(row.invoice, '#2450')
  assert.equal(row.amount, '₦24,000')
  assert.equal(row.discount, '₦6,000')
})
