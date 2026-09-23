import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Period } from '../../../api/timetables/types.ts'
import {
  classPeriodRow,
  periodBody,
  periodDeleteBody,
  periodLabel,
  periodRow,
  periodTime,
} from './period-row.ts'

/** Period 14 as `GET /timetables?limit=100` sends it. */
const PERIOD: Period = {
  id: 14,
  semester_id: 1,
  subject_id: 1,
  title: null,
  level_id: null,
  department_id: 1,
  programetype_id: null,
  lecturehall_id: null,
  venue: null,
  start_time: '08:56',
  end_time: '10:56',
  day_of_week: 'Monday',
  session_id: 8,
  dateadded: '2026-08-31T13:57:10+01:00',
  onlinelink: null,
  subject_name: 'ENGLISH LANGUAGE',
  label: 'ENGLISH LANGUAGE',
  class_name: 'JSS 1',
  session_name: '2024/2025',
  semester_name: 'First Term',
  where: null,
}

test('the register reads the names the endpoint already resolved', () => {
  const row = periodRow(PERIOD)
  assert.equal(row.id, '14')
  assert.equal(row.klass, 'JSS 1')
  assert.equal(row.day, 'Monday')
  assert.equal(row.time, '08:56 – 10:56')
  assert.equal(row.subject, 'ENGLISH LANGUAGE')
})

test('the row carries the ids the edit form opens on', () => {
  const row = periodRow(PERIOD)
  assert.equal(row.department_id, '1')
  assert.equal(row.subject_id, '1')
  assert.equal(row.session_id, '8')
  assert.equal(row.semester_id, '1')
  // The times go back into the clock control as the endpoint sends them.
  assert.equal(row.start_time, '08:56')
  assert.equal(row.end_time, '10:56')
})

test('a period named elsewhere still reads by its name', () => {
  // The office sets a subject, never a bare title — but a period made outside
  // this portal with one is shown as what it is rather than as a dash.
  const named = { ...PERIOD, subject_id: null, subject_name: null, title: 'Break', label: 'Break' }
  assert.equal(periodLabel(named), 'Break')
  assert.equal(periodRow(named).subject, 'Break')
  assert.equal(periodRow(named).subject_id, '')
})

test('half a slot still reads; neither does not', () => {
  assert.equal(periodTime({ id: 1, start_time: '08:00', end_time: null }), '08:00')
  assert.equal(periodTime({ id: 1 }), '—')
})

test('the form sends both of the pair the endpoint refuses without', () => {
  const body = periodBody({
    department_id: '1',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '09:00',
    subject_id: '1',
    session_id: '8',
    semester_id: '1',
  })
  assert.deepEqual(body, {
    department_id: 1,
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '09:00',
    subject_id: 1,
    // Sent as null rather than left out: a period that had a bare name becomes
    // the subject it was given, rather than keeping a name nobody can see.
    title: null,
    session_id: 8,
    semester_id: 1,
  })
})

test('an unset term is left out, so the endpoint falls back to the current one', () => {
  const body = periodBody({
    department_id: '1',
    day_of_week: 'Friday',
    start_time: '10:00',
    end_time: '10:40',
    subject_id: '2',
  })
  assert.equal(body.session_id, undefined)
  assert.equal(body.semester_id, undefined)
  assert.equal(body.subject_id, 2)
  assert.equal(body.title, null)
})

test('a class’s own tab drops the class it is already about', () => {
  const row = classPeriodRow(PERIOD)
  assert.deepEqual(row, {
    id: '14',
    day: 'Monday',
    time: '08:56 – 10:56',
    subject: 'ENGLISH LANGUAGE',
  })
})

test('the confirm says what goes and what does not', () => {
  const body = periodDeleteBody(periodRow(PERIOD))
  assert.match(body, /^ENGLISH LANGUAGE · JSS 1 on Monday at 08:56 – 10:56/)
  assert.match(body, /Nothing else is affected/)
})
