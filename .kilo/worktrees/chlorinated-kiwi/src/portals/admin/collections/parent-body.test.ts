import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parentBody } from './parent-body.ts'

test('empty fields are dropped rather than sent blank', () => {
  const body = parentBody({
    fathersname: 'Emmanuel Udo',
    mothersname: '   ',
    pemailaddress: 'e.udo@example.com',
    fatherphone: '',
  })
  assert.equal(body.fathersname, 'Emmanuel Udo')
  assert.equal(body.mothersname, undefined)
  assert.equal(body.fatherphone, undefined)
})

test('a household may be one parent, which the API allows', () => {
  const body = parentBody({ mothersname: 'Chidinma Udo' })
  assert.equal(body.mothersname, 'Chidinma Udo')
  assert.equal(body.fathersname, undefined)
})

test('values are trimmed before they are sent', () => {
  assert.equal(parentBody({ address: '  14 Ogui Road  ' }).address, '14 Ogui Road')
})
