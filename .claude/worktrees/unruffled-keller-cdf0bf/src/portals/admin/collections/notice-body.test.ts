import assert from 'node:assert/strict'
import { test } from 'node:test'
import { noticeBody } from './notice-body.ts'

test('the form goes out as the board’s own body', () => {
  assert.deepEqual(
    noticeBody({
      title: '  Mid-term break ',
      message: 'School closes on Friday and reopens on the 14th.',
      recipients: 'all',
      status: 'active',
      department_id: '',
      link: '',
      expiresat: '',
    }),
    {
      title: 'Mid-term break',
      message: 'School closes on Friday and reopens on the 14th.',
      recipients: 'all',
      status: 'active',
      department_id: null,
      link: '',
      expiresat: '',
    },
  )
})

test('a class turns the notice from the school’s into that class’s', () => {
  const body = noticeBody({ recipients: 'students', department_id: '2' })
  assert.equal(body.department_id, 2)
})

test('an empty class is sent as null, not dropped', () => {
  // Dropping it would leave an edited notice on the class it was already on.
  assert.equal('department_id' in noticeBody({ recipients: 'all' }), true)
  assert.equal(noticeBody({ recipients: 'all' }).department_id, null)
})

test('the two fields the endpoint insists on are never left unset', () => {
  const bare = noticeBody({})
  // `recipients` is the only field the writer refuses without.
  assert.equal(bare.recipients, 'all')
  assert.equal(bare.status, 'active')
})

test('an empty link or expiry goes out empty, which is how the board says none', () => {
  const bare = noticeBody({ recipients: 'all' })
  assert.equal(bare.link, '')
  assert.equal(bare.expiresat, '')
})
