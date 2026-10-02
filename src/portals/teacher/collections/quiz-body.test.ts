import assert from 'node:assert/strict'
import { test } from 'node:test'
import { quizBody } from './quiz-body.ts'

/** What a teacher fills in, as the form hands it over. */
const FILLED = {
  name: '  Week 4 mental maths  ',
  description: 'Ten minutes, no calculators.',
  subject_id: '1',
  department_id: '1',
  class_arm_id: '',
  duration: '10',
  pass_mark: '50',
  total_questions: '10',
  shuffled: 'no',
  opens_at: '2026-10-02T08:00',
  closes_at: '2026-10-04T16:00',
}

test('the body is the school’s own words for each field', () => {
  assert.deepEqual(quizBody(FILLED), {
    quizname: 'Week 4 mental maths',
    subject_id: 1,
    department_id: 1,
    // Empty is every arm of the class — the ordinary case.
    class_arm_id: null,
    description: 'Ten minutes, no calculators.',
    duration: 10,
    pass_mark: 50,
    total_questions: 10,
    shuffle_questions: false,
    // Never `02/10/2026`: the school reads that as the 10th of February.
    start_date: '2026-10-02 08:00:00',
    end_date: '2026-10-04 16:00:00',
  })
})

test('a blank clock, pass mark or question count is null — no clock, no opinion, every question', () => {
  const body = quizBody({ ...FILLED, duration: '', pass_mark: '', total_questions: '' })
  assert.equal(body.duration, null)
  assert.equal(body.pass_mark, null)
  assert.equal(body.total_questions, null)
})

test('an arm goes as its id, and shuffling as a flag', () => {
  const body = quizBody({ ...FILLED, class_arm_id: '47', shuffled: 'yes' })
  assert.equal(body.class_arm_id, 47)
  assert.equal(body.shuffle_questions, true)
})

test('once a pupil has sat it, only the name, description and closing date go', () => {
  // Everything else is the record of what was asked, and is refused with a 409.
  assert.deepEqual(quizBody(FILLED, true), {
    quizname: 'Week 4 mental maths',
    description: 'Ten minutes, no calculators.',
    end_date: '2026-10-04 16:00:00',
  })
})
