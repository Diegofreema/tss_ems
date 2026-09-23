import assert from 'node:assert/strict'
import { test } from 'node:test'
import { batchKey, batchRow, lineRow, parseBatchKey } from './batch-row.ts'

test('a batch is named by the four ids its detail endpoint takes', () => {
  const key = { subjectId: 10, departmentId: 1, semesterId: 1, sessionId: 8 }
  assert.equal(batchKey(key), '10-1-1-8')
  assert.deepEqual(parseBatchKey('10-1-1-8'), key)
})

test('an id that is not four numbers is no batch', () => {
  assert.equal(parseBatchKey('10-1-1'), undefined)
  assert.equal(parseBatchKey('BAT-1142'), undefined)
})

test('a batch reads either spelling of its ids and its names', () => {
  // The endpoint answers empty on this deployment, so both the flat spelling
  // and the expanded one are read rather than one of them assumed.
  const flat = batchRow({
    subject_id: 10,
    department_id: 1,
    semester_id: 1,
    session_id: 8,
    subject_name: 'INTEGRATED SCIENCE',
    department_name: 'JSS 1',
    semester_name: 'First Term',
    session_name: '2024/2025',
    total: 3,
    approval_status: 'pending',
  })
  const expanded = batchRow({
    subject: { id: 10, name: 'INTEGRATED SCIENCE' },
    department: { id: 1, name: 'JSS 1' },
    semester: { id: 1, name: 'First Term' },
    session: { id: 8, name: '2024/2025' },
    count: 3,
    status: 'pending',
  })

  assert.equal(flat.id, '10-1-1-8')
  assert.equal(expanded.id, '10-1-1-8')
  assert.equal(flat.subject, 'INTEGRATED SCIENCE')
  assert.equal(expanded.subject, 'INTEGRATED SCIENCE')
  assert.equal(expanded.klass, 'JSS 1')
  assert.equal(expanded.lines, '3')
  assert.equal(expanded.state, 'pending')
})

test('a batch missing everything still reads as a row rather than crashing', () => {
  const row = batchRow({})
  assert.equal(row.id, '0-0-0-0')
  assert.equal(row.subject, '—')
})

test('a line names its student however the endpoint spells them', () => {
  const row = lineRow(
    {
      id: 11,
      regno: 'MGS/2020535',
      student: { fname: 'Aniegbokas', lname: 'Chukwudi' },
      ca: '6',
      score: '62.00',
      total: '68',
      grade: 'B',
      approval_status: 'pending',
    },
    0,
  )
  assert.equal(row.student, 'Aniegbokas Chukwudi')
  assert.equal(row.adm, 'MGS/2020535')
  assert.equal(row.exam, '62.00')
  assert.equal(lineRow({ regno: 'CUN/2026/4' }, 3).student, 'CUN/2026/4')
  // A line the endpoint did not number is still a distinct row.
  assert.equal(lineRow({ regno: 'CUN/2026/4' }, 3).id, '3')
})
