import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applicationBody, refusedFields } from './body.ts'
import { applicationSchema, type ApplicationValues } from './schema.ts'

/** The sample body on record, as the form would hold it. */
const SAMPLE: ApplicationValues = {
  department_id: '1',
  fname: 'Chidi',
  lname: 'Okafor',
  mname: 'Ebuka',
  dob: new Date(2011, 2, 12),
  gender: 'Male',
  address: '14 Douglas Road, Owerri',
  phone: '08031234567',
  country_id: '160',
  state_id: '2648',
  lga_id: '771',
  pschools: 'Sunrise Primary School',
  religion: 'Christian',
  email: '',
  fathersname: 'Emeka Okafor',
  mothersname: 'Ngozi Okafor',
  fatherphone: '08031111111',
  motherphone: '08032222222',
  fathersjob: 'Trader',
  mothersjob: 'Teacher',
  pemailaddress: 'okafor.family@example.com',
}

test('the sample comes out as the body the endpoint was shown', () => {
  assert.deepEqual(applicationBody(SAMPLE), {
    fname: 'Chidi',
    lname: 'Okafor',
    mname: 'Ebuka',
    dob: '2011-03-12',
    gender: 'Male',
    address: '14 Douglas Road, Owerri',
    phone: '08031234567',
    department_id: 1,
    country_id: 160,
    state_id: 2648,
    lga_id: 771,
    pschools: 'Sunrise Primary School',
    religion: 'Christian',
    email: '',
    fathersname: 'Emeka Okafor',
    mothersname: 'Ngozi Okafor',
    fatherphone: '08031111111',
    motherphone: '08032222222',
    fathersjob: 'Trader',
    mothersjob: 'Teacher',
    pemailaddress: 'okafor.family@example.com',
  })
})

test('the sample passes the schema, so the form accepts what the endpoint was shown', () => {
  const result = applicationSchema.safeParse(SAMPLE)
  assert.equal(result.success, true, JSON.stringify(result.error?.issues))
})

test('no LGA is sent as null, which the nullable column takes', () => {
  assert.equal(applicationBody({ ...SAMPLE, lga_id: '' }).lga_id, null)
})

test('a family from elsewhere is sent with their own country', () => {
  const body = applicationBody({ ...SAMPLE, country_id: '83', state_id: '1405', lga_id: '' })
  assert.equal(body.country_id, 83)
  assert.equal(body.state_id, 1405)
})

test('a birthday is the calendar day chosen, whatever UTC makes of it', () => {
  assert.equal(applicationBody({ ...SAMPLE, dob: new Date(2011, 2, 12, 0, 30) }).dob, '2011-03-12')
})

test('what was typed is trimmed, and an empty box goes as an empty string', () => {
  const body = applicationBody({ ...SAMPLE, fname: '  Chidi ', mname: '   ', email: ' ' })
  assert.equal(body.fname, 'Chidi')
  assert.equal(body.mname, '')
  assert.equal(body.email, '')
})

test('a refusal is read as the sentence for each field, the rule dropped', () => {
  assert.deepEqual(
    refusedFields({
      email: { _isUnique: 'This email has already applied' },
      phone: { _empty: 'Required', format: 'Bad format' },
    }),
    { email: 'This email has already applied', phone: 'Required' },
  )
  assert.deepEqual(refusedFields(undefined), {})
})
