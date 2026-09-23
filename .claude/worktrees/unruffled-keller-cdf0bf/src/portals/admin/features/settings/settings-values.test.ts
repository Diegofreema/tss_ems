import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SchoolSettings } from '../../../../api/settings/types.ts'
import {
  datesOutOfOrder,
  fromStoredDate,
  settingsBody,
  settingsValues,
  toStoredDate,
} from './settings-values.ts'

/** The one settings row exactly as `GET /settings` answers on bronze. */
const SETTINGS: SchoolSettings = {
  id: 1,
  name: 'NETPRO LMS BRONZE',
  address: 'Maryland, Nekede Imo State',
  email: 'info@netpro.africa',
  phone: '07036614567',
  rector: 'Fr. Dr. Wence Madu',
  rectorcerts: 'PhD',
  registrar: 'Rev Fr. John Ezenwankwo',
  registrarcerts: 'PhD',
  prefixes: {
    invoice: 'Netpr/Inv/',
    admin: 'NETPRO/',
    staff: 'Netpro/Adm',
    regno_format: 'NETPRO/',
    application_no: 'APP',
  },
  calendar: {
    session_id: 8,
    session: '2024/2025',
    semester_id: 1,
    semester: 'First Term',
    current_term_ends: '18/12/2026',
    next_term_begins: '08/01/2027',
  },
}

test('the form reads the two prefixes out of the nest they arrive in', () => {
  const values = settingsValues(SETTINGS)
  assert.equal(values.regnoformat, 'NETPRO/')
  assert.equal(values.application_no_prefix, 'APP')
  assert.equal(values.name, 'NETPRO LMS BRONZE')
  assert.equal(values.rectorcerts, 'PhD')
})

test('a settings row that has not arrived yet fills every field with nothing', () => {
  const values = settingsValues(undefined)
  assert.equal(values.name, '')
  assert.equal(values.regnoformat, '')
  assert.equal(values.currenttermends, undefined)
})

test('a stored date is read as day, month, year — never guessed at', () => {
  const date = fromStoredDate('18/12/2026')
  assert.equal(date?.getDate(), 18)
  assert.equal(date?.getMonth(), 11)
  assert.equal(date?.getFullYear(), 2026)
})

test('a date that was never a real day is left unset rather than rolled on', () => {
  // `new Date(2026, 1, 31)` is the third of March, which is not what the row said.
  assert.equal(fromStoredDate('31/02/2026'), undefined)
  assert.equal(fromStoredDate(''), undefined)
  assert.equal(fromStoredDate(undefined), undefined)
  assert.equal(fromStoredDate('2026-12-18'), undefined)
})

test('a date goes back as YYYY-MM-DD in the school’s own day', () => {
  // Built from the local parts: `toISOString` on midnight in Lagos is the day
  // before, and the term would be recorded as ending a day early.
  assert.equal(toStoredDate(new Date(2026, 11, 18)), '2026-12-18')
  assert.equal(toStoredDate(new Date(2027, 0, 8)), '2027-01-08')
  assert.equal(toStoredDate(undefined), undefined)
})

test('a date survives the round trip it will actually make', () => {
  const values = settingsValues(SETTINGS)
  assert.equal(toStoredDate(values.currenttermends), '2026-12-18')
  assert.equal(toStoredDate(values.nexttermbegins), '2027-01-08')
})

test('the body is keyed as the endpoint is, not as the response was', () => {
  const body = settingsBody(settingsValues(SETTINGS))
  assert.equal(body.regnoformat, 'NETPRO/')
  assert.equal(body.application_no_prefix, 'APP')
  assert.equal(body.currenttermends, '2026-12-18')
  assert.equal(body.nexttermbegins, '2027-01-08')
  // The nested shapes the row came back in are not sent back.
  assert.equal('prefixes' in body, false)
  assert.equal('calendar' in body, false)
})

test('an emptied text field is sent, so it can actually be cleared', () => {
  const body = settingsBody({ ...settingsValues(SETTINGS), rectorcerts: '  ' })
  assert.equal(body.rectorcerts, '')
  assert.equal('rectorcerts' in body, true)
})

test('a date nobody has picked is left out rather than blanked', () => {
  const body = settingsBody({ ...settingsValues(SETTINGS), currenttermends: undefined })
  assert.equal('currenttermends' in body, false)
  // The one that is set still goes.
  assert.equal(body.nexttermbegins, '2027-01-08')
})

test('the next term starting before this one ends is caught', () => {
  const { currenttermends: ends, nexttermbegins: begins } = settingsValues(SETTINGS)
  assert.equal(datesOutOfOrder(ends, begins), false)
  assert.equal(datesOutOfOrder(ends, new Date(2026, 10, 1)), true)
  // One date alone is not out of order with anything.
  assert.equal(datesOutOfOrder(ends, undefined), false)
  assert.equal(datesOutOfOrder(undefined, begins), false)
})
