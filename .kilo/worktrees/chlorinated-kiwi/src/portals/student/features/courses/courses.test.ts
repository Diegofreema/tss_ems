import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { MyCourses } from '../../../../api/my-schooling/types.ts'
import { classOf, courseRows, teachersOf } from './courses.ts'

/** `GET /students/me/courses` as it answers student 4, trimmed to two subjects. */
const ANSWER: MyCourses = {
  courses: [
    {
      id: 1,
      name: 'ENGLISH LANGUAGE',
      subjectcode: 'EL',
      creditload: 0,
      teachers: ['Teacher u 1 New Teacher', 'Mark Freeman', 'Diego Freeman'],
    },
    { id: 7, name: 'IGBO LANGUAGE', subjectcode: 'IL', creditload: 0, teachers: [] },
  ],
  count: 2,
  class: { id: 2, name: 'SSS I', arm: 'JSS 2 A' },
  session: { id: 8, name: '2024/2025' },
  semester: { id: 1, name: 'First Term' },
  message: null,
}

test('a course reads as its code, its subject and who teaches it', () => {
  const [english] = courseRows(ANSWER)
  assert.equal(english.code, 'EL')
  assert.equal(english.name, 'ENGLISH LANGUAGE')
  assert.equal(english.teacher, 'Teacher u 1 New Teacher, Mark Freeman, Diego Freeman')
})

test('the class, session and term are the registration\'s, so every row carries them', () => {
  const rows = courseRows(ANSWER)
  assert.deepEqual(
    rows.map((row) => [row.klass, row.session, row.term]),
    [
      ['SSS I · JSS 2 A', '2024/2025', 'First Term'],
      ['SSS I · JSS 2 A', '2024/2025', 'First Term'],
    ],
  )
})

test('teachers arrive as plain names, and none reads as blank', () => {
  assert.equal(teachersOf({ id: 2, teachers: ['C. Nnaji', ' D. Freeman '] }), 'C. Nnaji, D. Freeman')
  // A subject nobody has been assigned to teach sends an empty array.
  assert.equal(teachersOf({ id: 7, teachers: [] }), '—')
  assert.equal(teachersOf({ id: 2 }), '—')
})

test('a class the school has not named at all is a dash, not a stray separator', () => {
  assert.equal(classOf({ class: { id: 2, name: 'SSS I' } }), 'SSS I')
  assert.equal(classOf({ class: { id: 2 } }), '—')
  assert.equal(classOf({}), '—')
})

test('alphabetical, because a student scans the list for one subject', () => {
  const rows = courseRows({
    courses: [
      { id: 2, name: 'MATHEMATICS' },
      { id: 1, name: 'ENGLISH LANGUAGE' },
      { id: 11, name: 'Social Studies' },
    ],
  })
  assert.deepEqual(rows.map((row) => row.name), [
    'ENGLISH LANGUAGE',
    'MATHEMATICS',
    'Social Studies',
  ])
})

test('a course sent without its name is still nameable by its id', () => {
  const [row] = courseRows({ courses: [{ id: 7 }] })
  assert.equal(row.name, 'Subject 7')
  assert.equal(row.code, '—')
})

test('no registration is no rows, not a row of dashes', () => {
  assert.deepEqual(courseRows({ courses: [], message: 'No registration found.' }), [])
  assert.deepEqual(courseRows({}), [])
})
