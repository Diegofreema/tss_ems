import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TeacherResult } from '../../../../api/teaching/types.ts'
import { chosenTerm, termFromResults, termKey, termsFromResults } from './term.ts'

/** Two marks from GET /teachers/me/results, a term apart. */
const OLDER = {
  id: 3,
  session_id: 7,
  semester_id: 3,
  uploaddate: '2026-06-30T09:00:00+01:00',
  session: { id: 7, name: '2023/2024' },
  semester: { id: 3, name: 'Third Term' },
} as unknown as TeacherResult

const NEWER = {
  id: 9,
  session_id: 8,
  semester_id: 1,
  uploaddate: '2026-08-31T07:47:06+01:00',
  session: { id: 8, name: '2024/2025' },
  semester: { id: 1, name: 'First Term' },
} as unknown as TeacherResult

test('the term is read off the newest mark, whatever order they arrive in', () => {
  assert.deepEqual(termFromResults([OLDER, NEWER]), {
    session_id: 8,
    semester_id: 1,
    label: 'First Term · 2024/2025',
  })
  assert.deepEqual(termFromResults([NEWER, OLDER])?.label, 'First Term · 2024/2025')
})

test('a teacher who has never marked has no term to file into', () => {
  assert.equal(termFromResults([]), undefined)
})

test('a mark without a session is no answer either', () => {
  assert.equal(termFromResults([{ ...NEWER, session_id: 0 } as TeacherResult]), undefined)
})

test('ids without names still name themselves', () => {
  const bare = { ...NEWER, session: null, semester: null } as TeacherResult
  assert.equal(termFromResults([bare])?.label, 'Term 1 · session 8')
})

test('every term the school has filed into is offered, newest first', () => {
  // The picker's whole list. A teaching login may not read /sessions or
  // /semesters — measured again 2026-09-18, still 403 — so a mark is the only
  // place a term is ever named to a teacher.
  assert.deepEqual(termsFromResults([OLDER, NEWER]), [
    { session_id: 8, semester_id: 1, label: 'First Term · 2024/2025' },
    { session_id: 7, semester_id: 3, label: 'Third Term · 2023/2024' },
  ])
})

test('a term is offered once however many marks were filed into it', () => {
  // Thirty marks of one term is one option, not thirty. The newest of them
  // dates it, so the order stays the school's own chronology.
  const again = { ...NEWER, id: 11, uploaddate: '2026-09-01T08:00:00+01:00' }
  const terms = termsFromResults([NEWER, again, OLDER])
  assert.equal(terms.length, 2)
  assert.equal(terms[0].label, 'First Term · 2024/2025')
})

test('a mark missing either half of the pair names no term', () => {
  // Both ids are needed to file: a term of one session and a session of
  // another is not a place a mark can go.
  const halves = [
    { ...NEWER, semester_id: null },
    { ...NEWER, session_id: null },
  ] as unknown as TeacherResult[]
  assert.deepEqual(termsFromResults(halves), [])
})

test('the default is always one of the options offered', () => {
  // A sheet defaulting to a term its own picker does not list is how a mark
  // lands in the wrong year without anybody choosing it.
  const terms = termsFromResults([OLDER, NEWER])
  const chosen = termFromResults([OLDER, NEWER])
  assert.ok(terms.some((one) => termKey(one) === termKey(chosen!)))
})

test('the key carries both halves, so two terms of one session differ', () => {
  assert.equal(termKey({ session_id: 8, semester_id: 1 }), '8:1')
  assert.notEqual(
    termKey({ session_id: 8, semester_id: 1 }),
    termKey({ session_id: 8, semester_id: 2 }),
  )
})

/** The school's own lists, as a teacher will see them once they may read them. */
const SESSIONS = [
  { id: 8, name: '2024/2025' },
  { id: 7, name: '2023/2024' },
]
const TERMS = [
  { id: 1, name: 'First Term' },
  { id: 2, name: 'Second Term' },
  { id: 3, name: 'Third Term' },
]

test('what the teacher picked is what the sheet files into', () => {
  assert.deepEqual(chosenTerm(SESSIONS, TERMS, { session: '7', term: '2' }, undefined), {
    session_id: 7,
    semester_id: 2,
    label: 'Second Term · 2023/2024',
  })
})

test('picking nothing files into the term their own marks are in', () => {
  // The sheet has to open on something, and where their marks have been going
  // is the least surprising answer — the same one it used before there was
  // anything to pick.
  const own = { session_id: 7, semester_id: 3, label: 'Third Term · 2023/2024' }
  assert.deepEqual(chosenTerm(SESSIONS, TERMS, {}, own), {
    session_id: 7,
    semester_id: 3,
    label: 'Third Term · 2023/2024',
  })
})

test('a teacher with no marks at all still gets a saveable sheet', () => {
  // The top of each list: the newest session and the first term. Before this
  // they got a disabled Save button and a sentence about asking the office.
  assert.deepEqual(chosenTerm(SESSIONS, TERMS, {}, undefined), {
    session_id: 8,
    semester_id: 1,
    label: 'First Term · 2024/2025',
  })
})

test('a URL naming a session the school does not have is not honoured', () => {
  // A link can say anything. A mark filed into a year nobody has heard of is
  // worse than one filed into the obvious term.
  const own = { session_id: 7, semester_id: 3, label: 'Third Term · 2023/2024' }
  assert.equal(chosenTerm(SESSIONS, TERMS, { session: '999' }, own)?.session_id, 7)
})

test('with no calendar to read, the sheet behaves exactly as it did before', () => {
  // Which is the live case today: /sessions and /semesters both answer
  // "restricted to administrators" to a teaching login.
  const own = { session_id: 7, semester_id: 3, label: 'Third Term · 2023/2024' }
  assert.deepEqual(chosenTerm([], [], { session: '8', term: '1' }, own), own)
  assert.equal(chosenTerm([], [], {}, undefined), undefined)
})

test('the two halves are picked apart, so a session may change without the term', () => {
  // They travel together in the body and are chosen separately on screen.
  const own = { session_id: 7, semester_id: 3, label: 'Third Term · 2023/2024' }
  assert.deepEqual(chosenTerm(SESSIONS, TERMS, { session: '8' }, own), {
    session_id: 8,
    semester_id: 3,
    label: 'Third Term · 2024/2025',
  })
})
