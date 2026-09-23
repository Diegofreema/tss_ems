import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toDateTimeInput, toSchoolStamp } from './when.ts'

/*
 * The window's two stamp formats, read off bronze 2026-09-16:
 * `GET /setassignments` sends `2026-09-23 08:12:16` — a space, no zone — and
 * the student's own list sends `2026-08-28T10:08` for the same field with a
 * `+01:00` on the one beside it.
 */

test('the teacher list’s stamp opens the control on the same wall clock', () => {
  assert.equal(toDateTimeInput('2026-09-23 08:12:16'), '2026-09-23T08:12')
})

test('the student list’s two spellings read the same way', () => {
  assert.equal(toDateTimeInput('2026-08-28T10:08'), '2026-08-28T10:08')
  assert.equal(toDateTimeInput('2026-08-28T10:08:00+01:00'), '2026-08-28T10:08')
})

test('an offset is dropped rather than applied', () => {
  // The whole point: read as a real instant, 23:30+01:00 is the 22nd in UTC,
  // and a teacher in Lagos would open the form on the wrong day.
  assert.equal(toDateTimeInput('2026-09-23T23:30:00+01:00'), '2026-09-23T23:30')
  assert.equal(toDateTimeInput('2026-09-23T00:30:00Z'), '2026-09-23T00:30')
})

test('no stamp is an empty box, not a wrong one', () => {
  assert.equal(toDateTimeInput(null), '')
  assert.equal(toDateTimeInput(undefined), '')
  assert.equal(toDateTimeInput(''), '')
  assert.equal(toDateTimeInput('not a date'), '')
})

test('the control’s value goes back as the school writes it', () => {
  assert.equal(toSchoolStamp('2026-09-23T08:12'), '2026-09-23 08:12:00')
})

test('seconds already on the value are kept', () => {
  assert.equal(toSchoolStamp('2026-09-23T08:12:16'), '2026-09-23 08:12:16')
  assert.equal(toSchoolStamp('2026-09-23 08:12:16'), '2026-09-23 08:12:16')
})

test('an empty box is null — the school’s own "no bound"', () => {
  // Not an empty string: every paper on file carries `opendate: null`, and a
  // blank would be a window nobody could sit rather than one with no start.
  assert.equal(toSchoolStamp(''), null)
  assert.equal(toSchoolStamp('   '), null)
  assert.equal(toSchoolStamp(null), null)
})

test('something the control could not have produced is refused, not mangled', () => {
  assert.equal(toSchoolStamp('23/09/2026 08:12'), null)
  assert.equal(toSchoolStamp('2026-09-23'), null)
})

test('a window survives the round trip unchanged to the minute', () => {
  const held = '2026-09-23 08:12:00'
  assert.equal(toSchoolStamp(toDateTimeInput(held)), held)
})

/*
 * The third spelling, read off the wire 2026-09-16. `GET /setassignments`
 * returned `closedate: "2026-09-23 08:12:00"` — exactly as it had been sent —
 * and `opendate: "9/17/26, 10:14 AM"` on the same row. Two ends of one window,
 * two formats. The strict pattern found nothing, the edit form opened empty,
 * and saving from that box would have wiped the date.
 */
test('the school’s own display spelling of a date is read, not dropped', () => {
  assert.equal(toDateTimeInput('9/17/26, 10:14 AM'), '2026-09-17T10:14')
})

test('midday and midnight are the pair that does not simply add twelve', () => {
  assert.equal(toDateTimeInput('9/17/26, 12:30 AM'), '2026-09-17T00:30')
  assert.equal(toDateTimeInput('9/17/26, 12:30 PM'), '2026-09-17T12:30')
  assert.equal(toDateTimeInput('9/17/26, 1:05 PM'), '2026-09-17T13:05')
})

test('a four-digit year and seconds are both taken', () => {
  assert.equal(toDateTimeInput('9/17/2026, 10:14:59 AM'), '2026-09-17T10:14')
})

test('the display spelling round-trips back to something the school stores', () => {
  // The point of reading it at all: the form opens on it, and saving writes a
  // stamp back rather than a null that would have destroyed the setting.
  assert.equal(toSchoolStamp(toDateTimeInput('9/17/26, 10:14 AM')), '2026-09-17 10:14:00')
})

test('a stamp in no spelling anybody has seen is still an empty box, not a wrong one', () => {
  assert.equal(toDateTimeInput('sometime next week'), '')
  assert.equal(toDateTimeInput('17/9/26'), '')
})
