import assert from 'node:assert/strict'
import { test } from 'node:test'
import { officePhoto, photoSource, staffPhoto, studentPhoto } from './photo-url.ts'

const BASE = 'https://portal.tss.sch.ng/backend/'

test('a teacher photo is a public address in staff_files', () => {
  // Read off the school 2026-10-02: 200 image/png.
  assert.deepEqual(photoSource(staffPhoto('27_08_26_09_48_596a90080b0c39b3.92078397.png'), BASE), {
    url: 'https://portal.tss.sch.ng/backend/staff_files/27_08_26_09_48_596a90080b0c39b3.92078397.png',
  })
})

test('an office photo is a public address in img — not staff_files, where it is a 404', () => {
  assert.deepEqual(photoSource(officePhoto('05_10_25_08_00_1868e2259290bd0_loginlogo.png'), BASE), {
    url: 'https://portal.tss.sch.ng/backend/img/05_10_25_08_00_1868e2259290bd0_loginlogo.png',
  })
})

test('a student photo is fetched with the token, by its bare filename', () => {
  // `student_files/` answers 403 to a browser, so it is never handed to an
  // <img>; `users/download` serves from it with the token — 200 for
  // 6a96b40a8a03d1788261386.png, read off the school 2026-10-02.
  assert.equal(studentPhoto('6a96b40a8a03d1788261386.png'), 'student_files/6a96b40a8a03d1788261386.png')
  assert.deepEqual(photoSource(studentPhoto('6a96b40a8a03d1788261386.png'), BASE), {
    download: '6a96b40a8a03d1788261386.png',
  })
})

test('no photo is no source, so the initials show', () => {
  for (const nothing of [null, undefined, '', '   ']) {
    assert.equal(staffPhoto(nothing), '')
    assert.equal(officePhoto(nothing), '')
    assert.equal(studentPhoto(nothing), '')
  }
  for (const nothing of [null, undefined, '', '—', 'student_files/']) {
    assert.equal(photoSource(nothing, BASE), undefined)
  }
})

test('an address the school sends whole is left alone', () => {
  assert.equal(staffPhoto('https://cdn.example.com/p/1.png'), 'https://cdn.example.com/p/1.png')
  assert.deepEqual(photoSource('https://cdn.example.com/p/1.png', BASE), {
    url: 'https://cdn.example.com/p/1.png',
  })
})

test('the joins are clean either side, and a name is escaped by its parts', () => {
  assert.deepEqual(photoSource(staffPhoto('/my photo.jpg'), 'https://school.test///'), {
    url: 'https://school.test/staff_files/my%20photo.jpg',
  })
})
