import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  classSubjectLines,
  directionTone,
  figure,
  gradeLines,
  moverLines,
  studentPointLines,
  riskLines,
  signed,
  subjectLines,
  termLines,
} from './performance.ts'

test('a term is read for whichever field names it', () => {
  for (const key of ['semester', 'term', 'label', 'name']) {
    const [only] = termLines([{ [key]: 'First Term', average: 62 }])
    assert.equal(only.name, 'First Term', key)
    assert.equal(only.average, 62, key)
  }
})

test('a row that names itself nothing is still numbered, never blank', () => {
  const [only] = termLines([{ average: 50 }])
  assert.equal(only.name, 'Term 1')
})

test('a subject with no figure comes back undefined, not zero', () => {
  const [only] = subjectLines([{ name: 'Maths' }], 55)
  assert.equal(only.average, undefined)
  assert.equal(only.gap, undefined)
})

test('the gap to the student’s own average is worked out where it is not sent', () => {
  const [only] = subjectLines([{ subject: 'Maths', average: 80 }], 55)
  assert.equal(only.gap, 25)
})

test('a gap the server did send is used as it stands', () => {
  const [only] = subjectLines([{ subject: 'Maths', average: 80, gap: -3 }], 55)
  assert.equal(only.gap, -3)
})

test('with no own average there is nothing to compare against', () => {
  const [only] = subjectLines([{ subject: 'Maths', average: 80 }], null)
  assert.equal(only.gap, undefined)
})

test('a class subject carries the spread, whatever the server calls it', () => {
  for (const key of ['spread', 'stdev', 'standard_deviation', 'range']) {
    const [only] = classSubjectLines([{ subject: 'Maths', [key]: 12.5 }])
    assert.equal(only.spread, 12.5, key)
  }
})

test('highest and lowest are read under their common spellings', () => {
  const [only] = classSubjectLines([{ subject: 'Maths', max: 91, min: 12 }])
  assert.equal(only.highest, 91)
  assert.equal(only.lowest, 12)
})

test('a grade bucket with no count reads as none, not as missing', () => {
  const [only] = gradeLines([{ grade: 'A' }])
  assert.deepEqual([only.name, only.count], ['A', 0])
})

test('the grade breakdown is the map the school actually sends', () => {
  // Read off this school once it had approved marks: band to count, not the
  // array of rows this module guessed while every answer came back empty.
  // `.map` on it threw straight through the page's render, and the page then
  // said it could not reach a school that had answered in full.
  const lines = gradeLines({ '-': 2, A: 5, B: 1 })
  assert.deepEqual(
    lines.map((line) => [line.name, line.count]),
    [['-', 2], ['A', 5], ['B', 1]],
  )
  // Each band needs a key of its own, or React draws one row for three bands.
  assert.equal(new Set(lines.map((line) => line.key)).size, 3)
})

test('no grades at all is no rows, however the school spells nothing', () => {
  for (const nothing of [undefined, null, {}, []]) {
    assert.deepEqual(gradeLines(nothing), [])
  }
})

test('a mover’s change is worked out from the two ends where it is not sent', () => {
  const [only] = moverLines([{ name: 'Ada Obi', from: 48, to: 61 }])
  assert.equal(only.change, 13)
})

test('a fall is negative, and a change the server sent wins', () => {
  const [fell] = moverLines([{ name: 'Ada', before: 70, after: 55 }])
  assert.equal(fell.change, -15)
  const [sent] = moverLines([{ name: 'Ada', from: 70, to: 55, delta: -14 }])
  assert.equal(sent.change, -14)
})

test('a mover with only one end has no change to report', () => {
  const [only] = moverLines([{ name: 'Ada', to: 61 }])
  assert.equal(only.change, undefined)
})

test('an attendance-vs-marks row carries both axes', () => {
  const [only] = studentPointLines([
    { student_name: 'Ada Obi', attendance_rate: 92, average: 64 },
  ])
  assert.deepEqual([only.name, only.attendance, only.average], ['Ada Obi', 92, 64])
})

test('a flagged student keeps every reason the school gave', () => {
  const [only] = riskLines([
    { name: 'Ada Obi', reasons: ['Below the pass mark', 'Attendance under 75%'] },
  ])
  assert.deepEqual(only.reasons, ['Below the pass mark', 'Attendance under 75%'])
})

test('a single reason sent as a string is still a reason', () => {
  const [only] = riskLines([{ name: 'Ada', why: 'Below the pass mark' }])
  assert.deepEqual(only.reasons, ['Below the pass mark'])
})

test('a flagged student with no reasons has none — the screen must not invent one', () => {
  const [only] = riskLines([{ name: 'Ada' }])
  assert.deepEqual(only.reasons, [])
})

test('an expanded name is read for its name', () => {
  const [only] = riskLines([{ student: { id: 3, name: 'Ada Obi' } }])
  assert.equal(only.name, 'Ada Obi')
})

test('the direction is read as a tone, and anything unrecognised is neutral', () => {
  assert.equal(directionTone('rising'), 'up')
  assert.equal(directionTone('Improving'), 'up')
  assert.equal(directionTone('falling'), 'down')
  assert.equal(directionTone('steady'), 'muted')
  assert.equal(directionTone(null), 'muted')
})

test('a figure shows a dash for nothing, never a zero', () => {
  assert.equal(figure(undefined), '—')
  assert.equal(figure(null), '—')
  assert.equal(figure(0), '0')
  assert.equal(figure(64.25, '%'), '64.3%')
  assert.equal(figure(64), '64')
})

test('a change is always signed', () => {
  assert.equal(signed(4), '+4')
  assert.equal(signed(-4.26), '-4.3')
  assert.equal(signed(0), '0')
  assert.equal(signed(undefined), '—')
})

/*
 * Everything below is written against answers read off the live school once it
 * had approved marks, rather than against the candidate spellings this module
 * was built from. The rows are copied from those answers as they arrived.
 */

/** `GET /performance/student/{id}` → `terms[0]`, verbatim. */
const LIVE_TERM = {
  session_id: 12,
  session: '2025/2026',
  semester_id: 1,
  semester: 'First Term',
  term: 'First Term 2025/2026',
  subjects_counted: 2,
  average: 76.5,
  best: 85,
  worst: 68,
  passed: 2,
  change: null,
}

/** The same answer's `subjects[0]`. */
const LIVE_SUBJECT = {
  subject_id: 10,
  subject: 'INTEGRATED SCIENCE',
  terms_counted: 1,
  average: 85,
  best: 85,
  worst: 85,
  gap_to_own_average: 8.5,
  standing: 'stronger',
  passed: true,
}

/** `GET /performance/class` → `subjects[0]`. */
const LIVE_CLASS_SUBJECT = {
  subject_id: 1,
  subject: 'ENGLISH LANGUAGE',
  pupils: 3,
  marks_counted: 3,
  average: 75,
  highest: 85,
  lowest: 68,
  spread: 7.26,
  passed: 3,
  failed: 0,
  pass_rate: 100,
  grades: { A: 2, B: 1 },
}

test('a term is named by the label that says which year it was', () => {
  // The row carries both. `semester` is "First Term", which is the same words
  // for every year the student has been here; `term` names the year too.
  const [only] = termLines([LIVE_TERM])
  assert.equal(only.name, 'First Term 2025/2026')
  assert.equal(only.average, 76.5)
})

test('two years of the same term are two bars, not one', () => {
  // `semester_id` is 1 for the First Term of every year, and it was the whole
  // key — so React drew one bar for two terms and a year of history vanished.
  const lastYear = { ...LIVE_TERM, session_id: 11, session: '2024/2025', term: 'First Term 2024/2025', average: 61 }
  const lines = termLines([lastYear, LIVE_TERM])
  assert.equal(new Set(lines.map((line) => line.key)).size, 2)
  assert.deepEqual(lines.map((line) => line.average), [61, 76.5])
})

test('a subject gap is the school\u2019s own figure, not one worked out here', () => {
  // `gap_to_own_average` is the spelling the endpoint uses, and none of the
  // candidates had it — so this column was being recomputed every time.
  const [only] = subjectLines([LIVE_SUBJECT], 76.5)
  assert.equal(only.gap, 8.5)
  assert.equal(only.name, 'INTEGRATED SCIENCE')
  // And it is still worked out where the school sends no gap at all.
  const { gap_to_own_average: _none, ...without } = LIVE_SUBJECT
  assert.equal(subjectLines([without], 76.5)[0].gap, 8.5)
})

test('a class subject row reads every column off the live answer', () => {
  const [only] = classSubjectLines([LIVE_CLASS_SUBJECT])
  assert.deepEqual(
    [only.name, only.average, only.highest, only.lowest, only.spread, only.passRate, only.counted],
    ['ENGLISH LANGUAGE', 75, 85, 68, 7.26, 100, 3],
  )
})

test('a flagged student and a scatter point read off the live answers', () => {
  // `GET /performance/at-risk` → `pupils[0]`, and the same shape on
  // `attendance-vs-marks`, which is why one fixture serves both.
  const pupil = {
    student_id: 111,
    name: 'Ogechi Obi',
    average: 238,
    subjects_counted: 1,
    subjects_failing: 0,
    attendance_rate: 50,
    reasons: ['Present for 50% of the 2 day(s) marked.'],
  }
  const [risk] = riskLines([pupil])
  assert.deepEqual([risk.name, risk.average, risk.attendance], ['Ogechi Obi', 238, 50])
  assert.deepEqual(risk.reasons, ['Present for 50% of the 2 day(s) marked.'])
  const [point] = studentPointLines([pupil])
  assert.deepEqual([point.name, point.attendance, point.average], ['Ogechi Obi', 50, 238])
})
