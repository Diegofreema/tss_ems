import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TeacherResult } from '../../../../api/teaching/types.ts'
import { termFromResults } from './term.ts'

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
