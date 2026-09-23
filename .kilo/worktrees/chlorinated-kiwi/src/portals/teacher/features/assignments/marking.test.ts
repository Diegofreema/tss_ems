import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  AssignmentSubmission,
  MarkingAnswer,
} from '../../../../api/set-assignments/types.ts'
import {
  answerKey,
  autoGradable,
  choiceCount,
  chosenOption,
  correctOption,
  gradeBody,
  keyScore,
  maxTotal,
  needsHand,
  needsTeacher,
  openingScore,
  openingScores,
  overruled,
  rightCount,
  runningTotal,
  stateOf,
  submissionRows,
  wasRight,
} from './marking.ts'

/**
 * Every fixture below is bronze's own answer, copied from what
 * `/setassignments/35/submissions` and `/setassignments/submissions/36` sent
 * on 2 Sep 2026 — not from the shapes the school's notes described, which
 * disagreed with the server on nearly every field.
 */

/** A row of `GET /setassignments/{id}/submissions`. */
const SUBMITTED: AssignmentSubmission = {
  assignment_id: 36,
  graded: false,
  regno: 'NETPRO/2026/3',
  status: 'submitted',
  student: 'OBILO AJASINA',
  student_id: 3,
  submitted: '9/2/26, 5:56 PM',
  total_score: null,
}

/** A right answer, as the marking view sends it. */
const RIGHT: MarkingAnswer = {
  answer_id: 40,
  question_id: 37,
  question: 'What is the Sun',
  question_type: 'multiple_choice',
  points: 1,
  score: null,
  theory_answer: null,
  options: [
    { id: 80, option_text: 'A Star', is_correct: true, chosen: true },
    { id: 81, option_text: 'A moon', is_correct: false, chosen: false },
    { id: 82, option_text: 'A Sun', is_correct: false, chosen: false },
  ],
}

/** A wrong one, from the same submission. */
const WRONG: MarkingAnswer = {
  answer_id: 42,
  question_id: 39,
  question: 'Another Question',
  question_type: 'multiple_choice',
  points: 1,
  score: null,
  theory_answer: null,
  options: [
    { id: 88, option_text: 'What is the question', is_correct: false, chosen: true },
    { id: 89, option_text: 'This is the question', is_correct: true, chosen: false },
  ],
}

const WRITTEN: MarkingAnswer = {
  answer_id: 43,
  question_id: 40,
  question: 'Explain osmosis in your own words.',
  question_type: 'theory',
  points: 10,
  score: null,
  theory_answer: 'Water moves through a membrane to where there is less water.',
  options: [],
}

test('a submission is identified by the id the school calls `assignment_id`', () => {
  // Assignment 35's submission is 36: it is the submission's id, not the
  // assignment's, and reading it as `id` is what sent the marking page to
  // `?submission=undefined`.
  const [row] = submissionRows([SUBMITTED])
  assert.equal(row.id, '36')
})

test('the student is a name and an admission number, flat on the row', () => {
  const [row] = submissionRows([SUBMITTED])
  assert.equal(row.name, 'OBILO AJASINA')
  assert.equal(row.adm, 'NETPRO/2026/3')
  // Nameless is still openable, by whichever id the row does carry.
  assert.equal(submissionRows([{ assignment_id: 44, student_id: 9 }])[0].name, 'Student 9')
})

test('the submitted stamp is read back onto the format every other date uses', () => {
  assert.equal(submissionRows([SUBMITTED])[0].submitted, '02 Sept 2026, 17:56')
  // Anything that will not parse is shown exactly as the school sent it.
  assert.equal(
    submissionRows([{ ...SUBMITTED, submitted: 'just now' }])[0].submitted,
    'just now',
  )
})

test('marked is `graded`, and a total on its own where there is no flag', () => {
  assert.equal(stateOf(SUBMITTED), 'To mark')
  assert.equal(stateOf({ ...SUBMITTED, graded: true }), 'Marked')
  const { graded: _flag, ...noFlag } = SUBMITTED
  assert.equal(stateOf({ ...noFlag, total_score: 3 }), 'Marked')
  assert.equal(stateOf(noFlag), 'To mark')
})

test('what still needs marking comes first', () => {
  const rows = submissionRows([
    { ...SUBMITTED, assignment_id: 50, graded: true },
    { ...SUBMITTED, assignment_id: 51 },
  ])
  assert.deepEqual(rows.map((row) => row.id), ['51', '50'])
})

test('a mark is sent against the answer, never against the question', () => {
  assert.equal(answerKey(RIGHT), '40')
  assert.notEqual(answerKey(RIGHT), String(RIGHT.question_id))
})

test('what was picked and what was right are read off the options themselves', () => {
  assert.equal(chosenOption(RIGHT), 'A Star')
  assert.equal(correctOption(RIGHT), 'A Star')
  assert.equal(chosenOption(WRONG), 'What is the question')
  assert.equal(correctOption(WRONG), 'This is the question')
  assert.equal(wasRight(RIGHT), true)
  assert.equal(wasRight(WRONG), false)
})

test('an unanswered choice is not a wrong one, and neither is a written answer', () => {
  const skipped = { ...RIGHT, options: RIGHT.options?.map((o) => ({ ...o, chosen: false })) }
  assert.equal(wasRight(skipped), null)
  assert.equal(wasRight(WRITTEN), null)
  assert.equal(chosenOption(skipped), '')
})

test('the sheet marks the multiple choice itself and asks for the rest', () => {
  // The school scores nothing: every answer came back null. The key it does
  // send settles the choice outright, and a written answer is nobody's to
  // guess at.
  assert.equal(openingScore(RIGHT), '1')
  assert.equal(openingScore(WRONG), '0')
  assert.equal(openingScore(WRITTEN), '')
})

test('a written answer opens on the mark already given', () => {
  assert.equal(openingScore({ ...WRITTEN, score: 7 }), '7')
})

test('a choice answer opens on the key, even over a mark on file', () => {
  // The teacher can no longer type over a choice mark, so a stored one that
  // disagrees is a mark given by hand before that rule. The key is the
  // authority; the card says the stored figure is about to be replaced.
  assert.equal(openingScore({ ...WRONG, score: 1 }), '0')
  assert.equal(overruled({ ...WRONG, score: 1 }), 1)
})

test('a stored choice mark the key agrees with is not called a replacement', () => {
  // The ordinary case for a submission marked through this sheet: nothing to
  // say, so the card says nothing.
  assert.equal(overruled({ ...RIGHT, score: 1 }), null)
  assert.equal(overruled({ ...WRONG, score: 0 }), null)
})

test('nothing is claimed about a written answer or an unmarked one', () => {
  assert.equal(keyScore(WRITTEN), null)
  assert.equal(overruled({ ...WRITTEN, score: 3 }), null)
  assert.equal(overruled(WRONG), null)
})

test('the key gives the question’s own points, not a flat one', () => {
  assert.equal(keyScore({ ...RIGHT, points: 5 }), 5)
  assert.equal(keyScore({ ...WRONG, points: 5 }), 0)
})

test('a choice the student never answered is filled in as nought, not left blank', () => {
  // It is not a wrong answer — no icon marks it as one — but it earns nothing,
  // and a blank box was a mark the teacher had to type before the total meant
  // anything.
  const skipped = {
    ...RIGHT,
    options: RIGHT.options?.map((option) => ({ ...option, chosen: false })),
  }
  assert.equal(wasRight(skipped), null)
  assert.equal(openingScore(skipped), '0')
  assert.equal(runningTotal([skipped], openingScores([skipped])), 0)
})

test('an answer with no kind and no choices is still the teacher’s to mark', () => {
  // Read off `question_type` alone, an answer that came back without one would
  // be scored nought for having no options to be right about.
  const untyped: MarkingAnswer = {
    answer_id: 44,
    question_id: 41,
    question: 'Say why.',
    points: 5,
    score: null,
    theory_answer: 'Because it does.',
  }
  assert.equal(openingScore(untyped), '')
  assert.deepEqual(needsHand([untyped]), [untyped])
  assert.equal(choiceCount([untyped]), 0)
  assert.equal(wasRight(untyped), null)
})

test('the totals count every answer, and the tiles count the choices', () => {
  const answers = [RIGHT, WRONG, WRITTEN]
  assert.equal(maxTotal(answers), 12)
  assert.equal(rightCount(answers), 1)
  assert.equal(choiceCount(answers), 2)
  assert.deepEqual(needsHand(answers), [WRITTEN])
  assert.equal(runningTotal(answers, openingScores(answers)), 1)
  assert.equal(runningTotal(answers, { ...openingScores(answers), '43': '7' }), 8)
})

test('the sheet sends a mark for every answer, the choices included', () => {
  const answers = [RIGHT, WRONG, WRITTEN]
  assert.deepEqual(
    gradeBody({
      answers,
      scores: { ...openingScores(answers), '43': '7' },
      comment: '  Good work.  ',
      marked: false,
    }),
    // An answer left out of `scores` is an answer left unmarked, because
    // nothing on this server scores one on its own.
    { scores: { '40': 1, '42': 0, '43': 7 }, comment: 'Good work.' },
  )
})

test('a correction says it is one, and an empty box is nought given', () => {
  assert.deepEqual(
    gradeBody({ answers: [WRITTEN], scores: { '43': '' }, comment: ' ', marked: true }),
    { scores: { '43': 0 }, regrade: true },
  )
})

/*
 * Paper 90 off bronze 2026-09-16: four questions, every one multiple choice,
 * one submission. The school sent `graded: false`, `total_score: null` and
 * `score: null` on every answer — which is what made "To mark" and
 * "Waiting on you: 1" a claim about work nobody had.
 */
const CHOICE_ONLY = [
  { id: 103, question_type: 'multiple_choice' as const, points: 5 },
  { id: 104, question_type: 'multiple_choice' as const, points: 1 },
]

test('a paper of nothing but multiple choice needs no teacher', () => {
  assert.equal(needsTeacher(CHOICE_ONLY), false)
})

test('one theory question anywhere on the paper needs a teacher', () => {
  assert.equal(
    needsTeacher([...CHOICE_ONLY, { id: 105, question_type: 'theory', points: 3 }]),
    true,
  )
})

test('a question with no kind and no choices is a person’s to read', () => {
  // The conservative half of the rule: unrecognised is not "the key settles it".
  assert.equal(needsTeacher([{ id: 106 }]), true)
})

test('a question carrying choices counts as one even with no kind named', () => {
  assert.equal(
    needsTeacher([
      { id: 107, options: [{ id: 405, option_text: 'a' }, { id: 406, option_text: 'b' }] },
    ]),
    false,
  )
})

test('an empty paper still goes in front of a person', () => {
  // Not because there is anything to read — because a submission against a
  // paper with no questions is somebody's mistake, not a nought to file.
  assert.equal(needsTeacher([]), true)
})

test('an ungraded submission on a key-settled paper says who marked it', () => {
  const submission = { assignment_id: 90, graded: false, total_score: null }
  assert.equal(stateOf(submission, false), 'Marked by the system')
  assert.equal(stateOf(submission, true), 'To mark')
})

test('once the school has it on file it is simply marked', () => {
  const graded = { assignment_id: 90, graded: true, total_score: 6 }
  assert.equal(stateOf(graded, false), 'Marked')
  assert.equal(stateOf(graded, true), 'Marked')
})

const SCRIPT = {
  id: 90,
  answers: [
    {
      answer_id: 501,
      question_type: 'multiple_choice' as const,
      points: 5,
      score: null,
      options: [
        { id: 401, option_text: '1', is_correct: true, chosen: false },
        { id: 402, option_text: '2', is_correct: false, chosen: true },
      ],
    },
    {
      answer_id: 502,
      question_type: 'multiple_choice' as const,
      points: 1,
      score: null,
      options: [
        { id: 403, option_text: '20', is_correct: true, chosen: true },
        { id: 404, option_text: '30', is_correct: false, chosen: false },
      ],
    },
  ],
}

test('a key-settled submission is offered for filing, with its answers', () => {
  const [one] = autoGradable(
    [{ assignment_id: 90, graded: false, total_score: null }],
    [SCRIPT],
    false,
    new Set(),
  )
  assert.equal(one.id, '90')
  // The marks that go are the answer key's own: wrong, then right.
  assert.deepEqual(gradeBody({
    answers: one.answers,
    scores: openingScores(one.answers),
    comment: '',
    marked: false,
  }).scores, { '501': 0, '502': 1 })
})

test('nothing is filed for a paper a person has to read', () => {
  assert.deepEqual(
    autoGradable([{ assignment_id: 90, graded: false, total_score: null }], [SCRIPT], true, new Set()),
    [],
  )
})

test('a submission the school has already graded is left alone', () => {
  // Or a teacher's own marks would be overwritten by the key on every visit.
  assert.deepEqual(
    autoGradable([{ assignment_id: 90, graded: true, total_score: 6 }], [SCRIPT], false, new Set()),
    [],
  )
})

test('nothing is queued twice for the same submission', () => {
  assert.deepEqual(
    autoGradable(
      [{ assignment_id: 90, graded: false, total_score: null }],
      [SCRIPT],
      false,
      new Set(['90']),
    ),
    [],
  )
})

test('a script this device has not read yet is not filed as a nought', () => {
  assert.deepEqual(
    autoGradable([{ assignment_id: 90, graded: false, total_score: null }], [], false, new Set()),
    [],
  )
  assert.deepEqual(
    autoGradable(
      [{ assignment_id: 90, graded: false, total_score: null }],
      [{ id: 90, answers: [] }],
      false,
      new Set(),
    ),
    [],
  )
})
