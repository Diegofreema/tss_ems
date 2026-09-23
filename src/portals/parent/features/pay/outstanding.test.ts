import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { GatewayConfig } from '../../../../api/payments/types.ts'
import type { Child } from '../../family.ts'
import {
  callbackUrl,
  gatewayWarning,
  outstandingFor,
  settled,
  stateCopy,
} from './outstanding.ts'

const child = (invoices: Child['invoices']): Child => ({
  id: 1,
  name: 'Ada',
  full: 'Ada Obi',
  arm: 'JSS 1 A',
  adm: 'NP/001',
  owing: 0,
  paid: 0,
  present: 0,
  marked: 0,
  weeks: [],
  invoices,
})

const OWING = { id: '2451', invoice: '#2451', fee: 'Tuition', balance: '₦30,000' }
const PAID = { id: '2450', invoice: '#2450', fee: 'Books', balance: '₦0' }

test('an outstanding invoice is keyed by its id, not its printed reference', () => {
  // `invoice_id` is what a payment is opened against; "#2451" would have to
  // be picked apart to get it back.
  const [entry] = outstandingFor([child([OWING])])
  assert.equal(entry.id, '2451')
  assert.equal(entry.invoice, '#2451')
  assert.equal(entry.balanceValue, 30000)
})

test('a settled invoice is not offered for payment', () => {
  assert.deepEqual(outstandingFor([child([PAID])]), [])
  assert.equal(outstandingFor([child([OWING, PAID])]).length, 1)
})

test('the callback is built from the origin being served, not written down', () => {
  assert.equal(
    callbackUrl('https://school.example'),
    'https://school.example/parent/pay/done',
  )
})

const config = (over: Partial<GatewayConfig> = {}): GatewayConfig => ({
  mode: 'live',
  live: true,
  public_key_present: true,
  secret_key_present: true,
  ...over,
})

test('a live gateway with its keys in place warns about nothing', () => {
  assert.equal(gatewayWarning(config()), null)
  // A config that could not be read is not a claim that anything is wrong.
  assert.equal(gatewayWarning(undefined), null)
})

test('a demo gateway says so, because nothing paid on it is real', () => {
  assert.match(gatewayWarning(config({ live: false, mode: 'demo' }))!, /demo gateway/)
})

test('a missing key outranks the demo warning', () => {
  // The payment will not open at all, which is worth saying before it is tried.
  const warning = gatewayWarning(config({ live: false, secret_key_present: false }))
  assert.match(warning!, /not fully set up/)
})

test('only paid and failed are final', () => {
  assert.equal(settled('paid'), true)
  assert.equal(settled('failed'), true)
  assert.equal(settled('pending'), false)
  assert.equal(settled('initialized'), false)
  assert.equal(settled(undefined), false)
})

test('an unknown state reads as still waiting rather than as settled', () => {
  assert.equal(stateCopy(undefined).title, stateCopy('initialized').title)
  assert.equal(stateCopy('paid').title, 'Payment received')
})
