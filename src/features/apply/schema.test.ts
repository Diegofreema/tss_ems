import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applicationSchema,
  DOCUMENT_FIELDS,
  DRAFT_FIELDS,
  STEPS,
  stepOf,
  type ApplicationValues,
} from './schema.ts'

const fields = Object.keys(applicationSchema.shape)

const VALID: ApplicationValues = {
  department_id: '1',
  fname: 'Chidi',
  lname: 'Okafor',
  mname: '',
  dob: new Date(2011, 2, 12),
  gender: 'Male',
  religion: 'Christian',
  pschools: '',
  address: '14 Douglas Road, Owerri',
  phone: '08031234567',
  email: '',
  country_id: '160',
  state_id: '2648',
  lga_id: '',
  fathersname: 'Emeka Okafor',
  fatherphone: '08031111111',
  fathersjob: '',
  mothersname: '',
  motherphone: '',
  mothersjob: '',
  pemailaddress: '',
}

/** The fields a set of values is refused on, in no particular order. */
const refused = (values: Partial<ApplicationValues>) => {
  const result = applicationSchema.safeParse({ ...VALID, ...values })
  return result.success ? [] : [...new Set(result.error.issues.map((issue) => String(issue.path[0])))]
}

test('every field is on exactly one step', () => {
  const placed = STEPS.flatMap((step) => step.fields)
  assert.deepEqual([...placed].sort(), [...fields].sort())
  assert.equal(new Set(placed).size, placed.length)
})

test('a draft keeps every typed field, and never a document', () => {
  const typed = fields.filter((field) => !(DOCUMENT_FIELDS as readonly string[]).includes(field))
  assert.deepEqual([...DRAFT_FIELDS].sort(), [...typed].sort())
})

test('a document over 1 MB is refused in its own size, and none at all is fine', () => {
  const big = new File([new Uint8Array(1024 * 1024 + 1)], 'scan.jpg', { type: 'image/jpeg' })
  const small = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
  assert.deepEqual(refused({ passport: big }), ['passport'])
  assert.deepEqual(refused({ passport: small, birth_certificate: small }), [])
  assert.equal(stepOf('birth_certificate'), 3)
})

test('a refused field sends the reader back to its own step', () => {
  assert.equal(stepOf('fname'), 0)
  assert.equal(stepOf('state_id'), 1)
  assert.equal(stepOf('pemailaddress'), 2)
  assert.equal(stepOf('department_id'), 0)
  assert.equal(stepOf('something_else'), STEPS.length - 1)
})

test('one parent is enough — a family with a single parent can apply', () => {
  assert.deepEqual(refused({}), [])
  assert.deepEqual(
    refused({ fathersname: '', fatherphone: '', mothersname: 'Ngozi', motherphone: '0803 222 2222' }),
    [],
  )
})

test('no parent at all is refused on both names', () => {
  assert.deepEqual(refused({ fathersname: '', fatherphone: '' }).sort(), [
    'fathersname',
    'mothersname',
  ])
})

test('a parent named is a parent with a number', () => {
  assert.deepEqual(refused({ fatherphone: '' }), ['fatherphone'])
  assert.deepEqual(refused({ mothersname: 'Ngozi' }), ['motherphone'])
})

test('a phone number is held to its digits, not its spelling', () => {
  assert.deepEqual(refused({ phone: '+234 803 123 4567' }), [])
  assert.deepEqual(refused({ phone: '12345' }), ['phone'])
  assert.deepEqual(refused({ fatherphone: 'call me' }), ['fatherphone'])
})

test('emails are optional, and addresses when given', () => {
  assert.deepEqual(refused({ email: 'chidi@example.com', pemailaddress: '' }), [])
  assert.deepEqual(refused({ pemailaddress: 'okafor.family' }), ['pemailaddress'])
})

test('religion is one of the office’s own four words', () => {
  assert.deepEqual(refused({ religion: 'Muslim' }), [])
  assert.deepEqual(refused({ religion: 'Christianity' as never }), ['religion'])
})

test('the class is required — the endpoint refuses an application without one', () => {
  assert.deepEqual(refused({ department_id: '' }), ['department_id'])
})

test('a state is required and an LGA is not — the backend holds state_id NOT NULL', () => {
  assert.deepEqual(refused({ state_id: '' }), ['state_id'])
  assert.deepEqual(refused({ country_id: '' }), ['country_id'])
  assert.deepEqual(refused({ lga_id: '' }), [])
})
