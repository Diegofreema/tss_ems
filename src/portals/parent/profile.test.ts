import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Parent } from '../../api/parents/types.ts'
import { parentProfile } from './profile.ts'

const household: Parent = {
  id: 7,
  user_id: 41,
  fathersname: 'Emmanuel Udo',
  mothersname: 'Chidinma Udo',
  pemailaddress: 'e.udo@gmail.com',
  fatherphone: '08034412280',
  motherphone: '08125507741',
  fathersjob: null,
  mothersjob: null,
  address: '14 Bode Thomas Street, Surulere, Lagos',
  occupation: null,
  status: 'active',
  username: 'e.udo@gmail.com',
}

test('the page is the household, not one person', () => {
  const config = parentProfile(household)
  assert.equal(config.values.fullname, 'Emmanuel Udo & Chidinma Udo')
  assert.equal(config.initials, 'EC')
  // Each parent is their own line, so a guardian can see which number the
  // school will actually ring.
  assert.equal(config.values.father, 'Emmanuel Udo · 08034412280')
  assert.equal(config.values.mother, 'Chidinma Udo · 08125507741')
})

test('the occupations are left out rather than invented', () => {
  // `/sparents/me` does not select them — only the office's own directory
  // route does — so the line is a name and a phone and says nothing more.
  assert.equal(parentProfile(household).values.father.includes('·'), true)
  const withJob = parentProfile({ ...household, fathersjob: 'Trader' })
  assert.equal(withJob.values.father, 'Emmanuel Udo · 08034412280 · Trader')
})

test('nothing on the page can be typed into', () => {
  // A guardian has no endpoint for their own record: `POST /sparents/{id}` is
  // the office's. An editable box would be one whose Save had nowhere to go.
  const config = parentProfile(household)
  assert.ok(config.fields.every((field) => field.locked))
  assert.equal(config.fromRecord, true)
})

test('a household with one parent named reads as that one', () => {
  const single = parentProfile({ ...household, mothersname: null, motherphone: null })
  assert.equal(single.values.fullname, 'Emmanuel Udo')
  assert.equal(single.values.mother, '—')
})

test('a household the school has named nobody on is still recognisable', () => {
  const bare = parentProfile({ ...household, fathersname: null, mothersname: null })
  assert.equal(bare.values.fullname, 'e.udo@gmail.com')
  assert.equal(bare.initials, '··')
})

test('children are counted only where the endpoint expanded them', () => {
  // `/sparents/me` sends the record alone. "0 children" on a household with
  // three is worse than a line that does not appear at all.
  const alone = parentProfile(household)
  assert.equal(alone.meta, 'Guardian')
  assert.equal(
    alone.account.some((row) => row.label === 'Children linked'),
    false,
  )

  const withChildren = parentProfile({
    ...household,
    children: [{ id: 1 }, { id: 2 }] as Parent['children'],
  })
  assert.equal(withChildren.meta, 'Guardian · 2 children')
  assert.equal(
    withChildren.account.find((row) => row.label === 'Children linked')?.value,
    '2',
  )
})

test('a record that did not answer leaves the page empty rather than furnished', () => {
  // The route hands back undefined on a refusal: this is where someone lands
  // to change their password, so it stays readable without the record.
  const empty = parentProfile()
  assert.equal(empty.values.fullname, '')
  assert.equal(empty.values.email, '—')
  assert.equal(empty.fromRecord, undefined)
})
