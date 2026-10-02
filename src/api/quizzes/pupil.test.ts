import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clockOf, myQuizzesOf, paperOf, pupilQuizOf, resultOf } from './pupil.ts'

/*
 * None of these answers has been seen: the controller was not deployed when
 * this was written. The fixtures are the shapes the school's own document
 * describes in words, spelt the way its documented answers spell things — so
 * these tests hold the readers to that reading, and are the first thing to
 * correct against a real answer.
 */

/** A quiz as the teacher's record documents it, plus whether this pupil sat it. */
const OPEN = {
  id: 13,
  name: 'Week 4 mental maths',
  subject: 'MATHEMATICS',
  class: 'JSS I',
  status: 'active',
  duration_minutes: 10,
  total_marks: 20,
  pass_mark_percent: 50,
  asks: 10,
  opens: '2026-10-02 08:00',
  closes: '2026-10-04 00:00',
  sat: false,
}

test('the list is read under `quizzes`, and refused under nothing', () => {
  const [quiz] = myQuizzesOf({ quizzes: [OPEN] })
  assert.equal(quiz.id, 13)
  assert.equal(quiz.name, 'Week 4 mental maths')
  assert.equal(quiz.minutes, 10)
  assert.equal(quiz.passMark, 50)
  assert.equal(quiz.sat, false)
  assert.equal(quiz.started, false)
  // An empty list is an empty list; no list at all is not.
  assert.deepEqual(myQuizzesOf({ quizzes: [] }), [])
  assert.throws(() => myQuizzesOf({ something: 'else' }))
})

test('whether it was sat is read off any of the likely spellings', () => {
  assert.equal(pupilQuizOf({ ...OPEN, sat: undefined, has_sat: true })?.sat, true)
  assert.equal(pupilQuizOf({ ...OPEN, sat: undefined, my_status: 'submitted' })?.sat, true)
  assert.equal(
    pupilQuizOf({ ...OPEN, sat: undefined, sitting: { submitted_at: '2026-10-02 09:00' } })?.sat,
    true,
  )
  // Opened and not handed in: opening it again resumes.
  const started = pupilQuizOf({ ...OPEN, sat: undefined, sitting: { status: 'in_progress' } })
  assert.equal(started?.sat, false)
  assert.equal(started?.started, true)
})

test('a quiz with no clock reads as null minutes, not zero', () => {
  assert.equal(pupilQuizOf({ ...OPEN, duration_minutes: null })?.minutes, null)
})

test('the paper reads the teacher’s option map, never an answer key', () => {
  const paper = paperOf({
    quiz: { name: 'Week 4 mental maths' },
    questions: [
      {
        id: 22,
        question: 'What is 7 x 8?',
        question_type: 'multiple_choice',
        mark: 2,
        options: { '2': '56', '1': '54', '3': '58' },
        chosen: '2',
      },
      { id: 23, question: 'Seven is prime.', question_type: 'true_false', mark: 1 },
    ],
    seconds_left: 540.6,
    resumed: true,
  })
  assert.equal(paper.name, 'Week 4 mental maths')
  assert.equal(paper.secondsLeft, 540)
  assert.equal(paper.resumed, true)
  // In the option's own order, whatever order the map arrived in.
  assert.deepEqual(paper.questions[0].options, [
    ['1', '54'],
    ['2', '56'],
    ['3', '58'],
  ])
  assert.equal(paper.questions[0].chosen, '2')
  // The school writes a true/false question's options itself.
  assert.deepEqual(paper.questions[1].options, [
    ['1', 'True'],
    ['2', 'False'],
  ])
  assert.equal(paper.questions[1].chosen, '')
})

test('answers sent beside the questions are put back on them — a reload keeps them', () => {
  const paper = paperOf({
    questions: [{ id: 22, question: 'Q', options: { '1': 'a', '2': 'b' } }],
    answers: { '22': '1' },
  })
  assert.equal(paper.questions[0].chosen, '1')
})

test('a paper with no clock says so with null, not with zero seconds', () => {
  assert.equal(paperOf({ questions: [], seconds_left: null }).secondsLeft, null)
  assert.equal(clockOf({}).secondsLeft, null)
})

test('a heartbeat that ran out says expired', () => {
  assert.deepEqual(clockOf({ seconds_left: 0, expired: true }), { secondsLeft: 0, expired: true })
  assert.deepEqual(clockOf({ seconds_left: 30 }), { secondsLeft: 30, expired: false })
})

test('the result is the marks that could be marked, and says which could not', () => {
  const result = resultOf({
    score: 14,
    out_of: 18,
    percentage: 77.8,
    passed: true,
    unmarkable_questions: [31],
    already: false,
  })
  assert.equal(result.score, 14)
  assert.equal(result.outOf, 18)
  assert.equal(result.percent, 77.8)
  assert.equal(result.passed, true)
  assert.equal(result.unmarkable, 1)
})

test('a result nested under `result` is read the same, and the percentage worked out if absent', () => {
  const result = resultOf({ result: { score: 9, out_of: 20 }, already: true })
  assert.equal(result.percent, 45)
  assert.equal(result.already, true)
})

test('no pass mark is no opinion — passed is null, never false', () => {
  assert.equal(resultOf({ score: 3, out_of: 10, passed: null }).passed, null)
})
