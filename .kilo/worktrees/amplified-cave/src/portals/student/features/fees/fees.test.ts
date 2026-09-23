import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Invoice } from '../../../../api/invoices/types.ts'
import type { MyPayment } from '../../../../api/my-schooling/types.ts'
import { newestFirst } from '../../../../features/collections/newest.ts'
import { invoiceRows, paidTotal, paymentRows, reference } from './fees.ts'

/** Two of the three bills `GET /students/me/invoices` sends for student 4. */
const INVOICES = [
  {
    id: 2440,
    fee_id: 1,
    amount: '30000',
    paystatus: 'success',
    invoiceid: 'TSS1/4',
    createdate: '2026-08-27T08:03:13+01:00',
    payday: '2026-08-27 09:23:47',
    session: { id: 8, name: '2024/2025' },
    fee: { id: 1, name: 'TUITION FEE' },
  },
  {
    id: 2453,
    fee_id: 6,
    amount: '20000',
    paystatus: 'success',
    invoiceid: 'TSS6INV4',
    createdate: '2026-08-31T07:35:40+01:00',
    payday: '2026-08-31 08:37:23',
    session: { id: 8, name: '2024/2025' },
    fee: { id: 6, name: 'Meidcal FEE' },
  },
] as unknown as Invoice[]

/** The payments the bursary took against them. */
const PAYMENTS = [
  {
    id: 16,
    invoice_id: 2440,
    amount: '30000',
    discount: '0.00',
    paystatus: 'success',
    payref: 'MANUAL_CASH_20260827092347_1',
    pgateway: 'cash',
    notes: 'payment collected by chukwudi',
    transdate: '2026-08-27T09:23:47+01:00',
  },
  {
    id: 19,
    invoice_id: 2453,
    amount: '20000',
    discount: '0.00',
    paystatus: 'success',
    payref: 'MANUAL_CASH_20260831083723_1',
    pgateway: 'cash',
    notes: 'paid',
    transdate: '2026-08-31T08:37:23+01:00',
  },
] as unknown as MyPayment[]

test('a bill reads as the register shows it, newest first', () => {
  const [newest, older] = invoiceRows(INVOICES, PAYMENTS)
  assert.equal(newest?.id, '2453')
  assert.equal(newest?.invoice, 'TSS6INV4')
  assert.equal(newest?.fee, 'Meidcal FEE')
  assert.equal(newest?.amount, '₦20,000')
  assert.equal(newest?.paid, '₦20,000')
  assert.equal(newest?.state, 'Paid')
  assert.equal(older?.invoice, 'TSS1/4')
})

test('how it was taken comes off the payment, not the bill', () => {
  const [row] = invoiceRows(INVOICES, PAYMENTS)
  assert.equal(row?.method, 'Cash')
  assert.equal(row?.payref, 'MANUAL_CASH_20260831083723_1')
})

test('a bill with no payment recorded says so rather than guessing', () => {
  const [row] = invoiceRows(INVOICES, [])
  assert.equal(row?.method, '—')
  assert.equal(row?.payref, '—')
})

test('an unpaid bill is owing, and nothing has been paid on it', () => {
  const [row] = invoiceRows(
    [{ ...INVOICES[0], id: 9, paystatus: 'Unpaid', invoiceid: null } as Invoice],
    [],
  )
  assert.equal(row?.state, 'Owing')
  assert.equal(row?.amount, '₦30,000')
  assert.equal(row?.paid, '₦0')
  assert.equal(row?.settledOn, '—')
  assert.equal(row?.invoice, '#9')
})

test('the panel carries the session and both dates', () => {
  const [row] = invoiceRows(INVOICES, PAYMENTS)
  assert.equal(row?.session, '2024/2025')
  assert.equal(row?.raised, '31 Aug 2026')
  assert.match(row?.settledOn ?? '', /^31 Aug 2026/)
})

test('the payments tab shows only what was taken against that bill', () => {
  const rows = paymentRows(PAYMENTS, '2440')
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.amount, '₦30,000')
  assert.equal(rows[0]?.method, 'Cash')
  assert.equal(rows[0]?.note, 'payment collected by chukwudi')
  assert.match(rows[0]?.paidOn ?? '', /^27 Aug 2026/)
  assert.deepEqual(paymentRows(PAYMENTS, '999'), [])
})

test('only settled bills count towards what has been paid', () => {
  assert.equal(paidTotal(INVOICES), 50000)
  assert.equal(paidTotal([...INVOICES, { amount: '99', paystatus: 'Unpaid' } as Invoice]), 50000)
})

test('bills raised in the same second still come back in one order', () => {
  const same = [
    { id: 2440, createdate: '2026-08-27T08:03:13+01:00' },
    { id: 2441, createdate: '2026-08-27T08:03:13+01:00' },
  ] as unknown as Invoice[]
  assert.deepEqual(newestFirst(same).map((invoice) => invoice.id), [2441, 2440])
})

test('an invoice with no printed reference is named by its id', () => {
  assert.equal(reference({ id: 12, invoiceid: '  ' } as Invoice), '#12')
})
