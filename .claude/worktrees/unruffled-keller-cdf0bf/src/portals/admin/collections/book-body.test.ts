import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bookBody } from './book-body.ts'

const FILLED = {
  title: ' Things Fall Apart ',
  author: 'Chinua Achebe',
  isbn: '978-0435925',
  section: 'Fiction',
  pubdate: '1958',
  copies: '40',
  callno: '823',
  department_id: '2',
  isavailable: 'Available',
}

test('the form goes out keyed as the endpoint is, and trimmed', () => {
  const body = bookBody(FILLED)
  assert.equal(body.title, 'Things Fall Apart')
  assert.equal(body.copies, 40)
  assert.equal(body.department_id, 2)
  assert.equal(body.callno, '823')
})

test('fields left blank are dropped, so an edit clears nothing it did not touch', () => {
  const body = bookBody({ ...FILLED, isbn: '', section: '   ', callno: '' })
  assert.equal(body.isbn, undefined)
  assert.equal(body.section, undefined)
  assert.equal(body.callno, undefined)
  assert.equal('isbn' in body, true)
})

test('a copy count that is not a number is not sent as one', () => {
  assert.equal(bookBody({ ...FILLED, copies: 'many' }).copies, undefined)
  assert.equal(bookBody({ ...FILLED, copies: '' }).copies, undefined)
})

test('availability is one of the two words the API spells, defaulting to on the shelf', () => {
  assert.equal(bookBody({ ...FILLED, isavailable: 'Unavailable' }).isavailable, 'Unavailable')
  assert.equal(bookBody({ ...FILLED, isavailable: '' }).isavailable, 'Available')
  assert.equal(bookBody({ ...FILLED, isavailable: 'nonsense' }).isavailable, 'Available')
})

test('the cover goes out as the file itself, for the multipart body', () => {
  const cover = new File(['jpeg'], 'achebe.jpg', { type: 'image/jpeg' })
  assert.equal(bookBody({ ...FILLED, bookimage: cover }).bookimage, cover)
})

test('a form with no cover picked leaves the one already on file alone', () => {
  assert.equal(bookBody(FILLED).bookimage, undefined)
  // The filename the record reads back is not a file, and sending it would
  // save the word "achebe.jpg" over the cover it names.
  assert.equal(bookBody({ ...FILLED, bookimage: 'achebe.jpg' }).bookimage, undefined)
})
