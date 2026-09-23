import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applicantDocuments, applicantRow } from './applicant-row.ts'

/** An application as GET /students/{id} returns one, trimmed to what is read. */
const applicant = {
  id: 4,
  fname: 'UDOYE',
  lname: 'OKIGBO',
  mname: 'OZOMGBO',
  regno: null,
  application_no: 'CUN/APP20264',
  status: 'Applied',
  studentstatus: null,
  joindate: '2026-08-26T12:08:43+00:00',
  department: { name: 'JSS II' },
  department_id: 2,
  birthcerturl: 'birth-4.pdf',
  olevelresulturl: '',
  othercerts: null,
  passporturl: '6a8ed74b.png',
} as never

test('the applications register reads the design’s columns off the record', () => {
  const row = applicantRow(applicant)
  assert.equal(row.ref, 'CUN/APP20264')
  assert.equal(row.name, 'UDOYE OZOMGBO OKIGBO')
  assert.equal(row.applying, 'JSS II')
  assert.equal(row.submitted, '26 Aug 2026')
  assert.equal(row.stage, 'Applied')
})

test('an application with no number falls back to the registration one', () => {
  const row = applicantRow({ ...(applicant as object), application_no: null, regno: 'CUN/2026/4' } as never)
  assert.equal(row.ref, 'CUN/2026/4')
})

test('the class the application names is kept, so the review form opens on it', () => {
  assert.equal(applicantRow(applicant).department_id, '2')
})

test('every document slot is listed, supplied or not', () => {
  const documents = applicantDocuments(applicantRow(applicant))
  assert.deepEqual(
    documents.map((one) => [one.label, one.meta, one.count]),
    [
      ['Birth certificate', 'birth-4.pdf', 1],
      ['Last school report', 'Not supplied', 0],
      ['Other certificates', 'Not supplied', 0],
      ['Passport photograph', '6a8ed74b.png', 1],
    ],
  )
})

test('a flow opened without a record still lists the slots', () => {
  assert.equal(applicantDocuments(undefined).every((one) => one.count === 0), true)
})
