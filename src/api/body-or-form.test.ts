import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bodyOrForm, carriesFile } from './client.ts'

test('a body with no file stays JSON, untouched', () => {
  const body = { fname: 'Ngozi', mname: null }
  assert.deepEqual(bodyOrForm(body), { body })
  assert.equal(carriesFile(body), false)
})

test('a body with a file goes multipart, and a null still clears', () => {
  const passport = new File(['x'], 'ngozi.jpg', { type: 'image/jpeg' })
  const { form, body } = bodyOrForm({ fname: 'Ngozi', mname: null, phone: undefined, department_id: 3, passport })
  assert.equal(body, undefined)
  assert.ok(form)
  assert.equal(form.get('fname'), 'Ngozi')
  assert.equal(form.get('mname'), '')
  assert.equal(form.has('phone'), false)
  assert.equal(form.get('department_id'), '3')
  assert.equal((form.get('passport') as File).name, 'ngozi.jpg')
})
