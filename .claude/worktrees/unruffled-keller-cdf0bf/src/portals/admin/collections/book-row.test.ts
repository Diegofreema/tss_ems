import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Book } from '../../../api/library/types.ts'
import { bookRow } from './book-row.ts'

/** Verbatim from GET /admins/books — title 1 of the four on bronze. */
const BOOK: Book = {
  id: 1,
  title: 'the new updated title',
  author: 'Dr Aniegboka Chukwudi',
  pubdate: '2011',
  isavailable: 'Available',
  date_created: '2026-02-20T18:37:45+01:00',
  user_id: 617,
  isbn: '2453536',
  coverphoto: null,
  copies: 20,
  section: 'CSC Section',
  callno: 45,
  department_id: 1,
}

test('a title reads as the catalogue holds it', () => {
  const row = bookRow(BOOK)
  assert.equal(row.title, 'the new updated title')
  assert.equal(row.isbn, '2453536')
  assert.equal(row.copies, '20')
  assert.equal(row.callno, '45')
  assert.equal(row.isavailable, 'Available')
})

test('the date added is the day, not the timestamp beside it', () => {
  assert.equal(bookRow(BOOK).added, '2026-02-20')
})

test('what the school never filled in reads blank, not empty', () => {
  const bare = bookRow({ ...BOOK, isbn: null, section: null, callno: null, pubdate: null })
  assert.equal(bare.isbn, '—')
  assert.equal(bare.section, '—')
  assert.equal(bare.callno, '—')
  assert.equal(bare.pubdate, '—')
})

test('a class the book belongs to no class submits nothing, never a dash', () => {
  // The dash would be sent to the API as the class id; the select needs empty.
  assert.equal(bookRow({ ...BOOK, department_id: null }).department_id, '')
  assert.equal(bookRow(BOOK).department_id, '1')
})

test('the year is shown as written, not parsed into a date', () => {
  // Three of the four titles carry a bare year and one a full date, because
  // the column is free text.
  assert.equal(bookRow(BOOK).pubdate, '2011')
  assert.equal(bookRow({ ...BOOK, pubdate: '2025-06-10' }).pubdate, '2025-06-10')
})
