import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { fileKind, fileLabel, fileRef, mimeFor, teacherCv } from './file-ref.ts'

const BASE = 'https://portal.tss.sch.ng/backend/'

describe('fileRef', () => {
  it('reads a bare filename as a student file, fetched with the token', () => {
    assert.deepEqual(fileRef('6a96b40a8a03d1788261386.pdf', BASE), {
      download: '6a96b40a8a03d1788261386.pdf',
    })
  })

  it('reads a photo reference the way the avatar does', () => {
    assert.deepEqual(fileRef('student_files/kid.png', BASE), { download: 'kid.png' })
    assert.deepEqual(fileRef('staff_files/teacher.png', BASE), {
      url: 'https://portal.tss.sch.ng/backend/staff_files/teacher.png',
    })
  })

  it('reads an api: reference as an endpoint that hands back a file', () => {
    assert.deepEqual(fileRef(teacherCv(12), BASE), { api: 'teachers/12/cv' })
  })

  it('reads nothing where there is nothing', () => {
    for (const empty of ['', '   ', '—', null, undefined, 'api:']) {
      assert.equal(fileRef(empty, BASE), undefined, String(empty))
    }
  })
})

describe('fileLabel', () => {
  it('shows the filename and not its folder', () => {
    assert.equal(fileLabel('staff_files/teacher.png'), 'teacher.png')
    assert.equal(fileLabel('birth.pdf'), 'birth.pdf')
  })
})

describe('fileKind', () => {
  it('believes the type the school sent', () => {
    assert.equal(fileKind('anything', 'image/jpeg'), 'image')
    assert.equal(fileKind('anything', 'application/pdf'), 'pdf')
  })

  it('falls back to the extension when the type says nothing', () => {
    assert.equal(fileKind('cert.PDF', 'application/octet-stream'), 'pdf')
    assert.equal(fileKind('photo.JPG'), 'image')
    assert.equal(fileKind('report.docx'), 'other')
    assert.equal(fileKind('scan.png?v=2'), 'image')
  })
})

describe('mimeFor', () => {
  it('names a type a frame or an image can draw', () => {
    assert.equal(mimeFor('pdf', 'x.pdf'), 'application/pdf')
    assert.equal(mimeFor('image', 'x.jpg'), 'image/jpeg')
    assert.equal(mimeFor('image', 'x.png'), 'image/png')
    assert.equal(mimeFor('other', 'x.docx'), '')
  })
})
