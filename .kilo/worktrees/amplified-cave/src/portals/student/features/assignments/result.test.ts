import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AssignmentResult, Question } from '../../../../api/assignments/types.ts'
import { answerRows, isScored, resultFields, scoreHeadline, scoreNote } from './result.ts'

/** Submission 18 as `GET /assignments/results/18` sends it: nothing recorded. */
const UNMARKED: AssignmentResult = {
  assignment: {
    id: 18,
    title: 'Simple additions',
    subject: 'MATHEMATICS',
    status: 'submitted',
    start_time: '2026-08-27T10:00:00+01:00',
    end_time: '2026-08-27T13:59:07+01:00',
    duration: '03:59:07',
    is_graded: false,
    teacher_comments: null,
  },
  student: { id: 4, regno: 'CUN/2026/4', name: 'UDOYE OKIGBO' },
  score: { total_questions: 0, correct_answers: 0, total_score: 0, max_points: 0, percentage: 0 },
  answers: [],
}

/** Submission 11, which does carry marks. */
const MARKED: AssignmentResult = {
  assignment: {
    id: 11,
    title: 'new assignment reading',
    subject: 'ENGLISH LANGUAGE',
    duration: '00:00:49',
    is_graded: false,
  },
  score: { total_questions: 4, correct_answers: 3, total_score: 15, max_points: 20, percentage: 75 },
  answers: [
    {
      question_id: 5,
      question_text: 'who is the governor of imo state',
      question_type: 'multiple_choice',
      points: 5,
      selected_option_id: 11,
      theory_answer: null,
      is_correct: true,
    },
    {
      question_id: 8,
      question_text: 'Where is Imo state located?',
      question_type: 'multiple_choice',
      points: 5,
      selected_option_id: 25,
      theory_answer: null,
      is_correct: false,
    },
  ],
}

const QUESTIONS: Question[] = [
  {
    id: 5,
    question_type: 'multiple_choice',
    options: [
      { id: 11, option_text: 'Hope Uzodinma' },
      { id: 12, option_text: 'Rochas Okorocha' },
    ],
  },
]

test('nothing scored is said in words — never as a mark of zero', () => {
  assert.equal(isScored(UNMARKED), false)
  assert.equal(scoreHeadline(UNMARKED), 'Not marked yet')
  assert.match(scoreNote(UNMARKED), /has not marked this assignment/)
  assert.doesNotMatch(scoreNote(UNMARKED), /0 of 0/)
})

test('a scored assignment reports its percentage and what it is out of', () => {
  assert.equal(scoreHeadline(MARKED), '75%')
  assert.match(scoreNote(MARKED), /^15 of 20 marks, from 3 of 4 questions\./)
})

test('ungraded means the written answers are still out, so the mark can rise', () => {
  assert.match(scoreNote(MARKED), /still with your teacher/)
  assert.doesNotMatch(
    scoreNote({ ...MARKED, assignment: { id: 11, is_graded: true } }),
    /still with your teacher/,
  )
})

test('the slip reads the school clock and says who has still to look', () => {
  const fields = Object.fromEntries(resultFields(UNMARKED).map((one) => [one.label, one.value]))
  assert.equal(fields.Assignment, 'Simple additions')
  assert.equal(fields.Started, '27 Aug 2026, 10:00')
  assert.equal(fields.Submitted, '27 Aug 2026, 13:59')
  assert.equal(fields.Took, '03:59:07')
  assert.equal(fields['Marked by a teacher'], 'Not yet')
  assert.equal(fields["Teacher's note"], '—')
})

test('an option id is shown as the option, read off the assignment', () => {
  const [right, wrong] = answerRows(MARKED, QUESTIONS)
  assert.equal(right.answer, 'Hope Uzodinma')
  assert.equal(right.verdict, 'Correct')
  assert.equal(right.worth, '5')
  // Question 8's options were not on the assignment handed in, so the id stands.
  assert.equal(wrong.answer, 'Option 25')
  assert.equal(wrong.verdict, 'Wrong')
})

test('an answer nobody has read is not marked, which is not the same as wrong', () => {
  const [row] = answerRows(
    {
      answers: [
        { question_id: 9, question_text: 'Summarise it.', theory_answer: 'Chapter 4 is…', is_correct: null, points: 10 },
      ],
    },
    [],
  )
  assert.equal(row.verdict, 'Not marked')
  assert.equal(row.answer, 'Chapter 4 is…')
})

test('a question skipped altogether says so rather than showing an id', () => {
  const [row] = answerRows({ answers: [{ question_id: 3, selected_option_id: null }] }, [])
  assert.equal(row.answer, 'Left blank')
})

test('a submission with no answers recorded produces no rows', () => {
  assert.deepEqual(answerRows(UNMARKED, []), [])
  assert.deepEqual(answerRows(undefined, []), [])
})

/**
 * Paper 90 off bronze 2026-09-16: four multiple-choice questions, no teacher
 * near it, and the server had already scored it — 1 of 8, `is_graded: false`.
 */
const CHOICE_ONLY: AssignmentResult = {
  assignment: { id: 90, title: 'Assignment 1', is_graded: false },
  score: { total_score: 1, max_points: 8, correct_answers: 1, total_questions: 4, percentage: 12.5 },
  answers: [
    { question_id: 1, question_type: 'multiple_choice', points: 5, is_correct: false },
    { question_id: 2, question_type: 'multiple_choice', points: 1, is_correct: true },
    { question_id: 3, question_type: 'multiple_choice', points: 1, is_correct: false },
    { question_id: 4, question_type: 'multiple_choice', points: 1, is_correct: false },
  ],
}

test('a finished all-choice paper is not promised it might go up', () => {
  // The server scored it at submit and no teacher is coming. "This can go up"
  // would be holding out a hope the paper cannot deliver.
  const note = scoreNote(CHOICE_ONLY)
  assert.match(note, /1 of 8 marks/)
  assert.doesNotMatch(note, /can go up/)
})

test('a paper with writing on it still says the mark is not final', () => {
  const mixed: AssignmentResult = {
    ...CHOICE_ONLY,
    score: { ...CHOICE_ONLY.score, total_questions: 3 },
    answers: [
      ...(CHOICE_ONLY.answers ?? []),
      { question_id: 3, question_type: 'theory', points: 4, theory_answer: 'Because of erosion.' },
    ],
  }
  assert.match(scoreNote(mixed), /can go up/)
})

test('an answer list shorter than the paper keeps the sentence, to be safe', () => {
  // Seen live: this route sent 2 answers against a stated 4. "None of the two
  // I can see is written" is not "nothing on this paper is written".
  const partial: AssignmentResult = {
    ...CHOICE_ONLY,
    score: { ...CHOICE_ONLY.score, total_questions: 4 },
    answers: (CHOICE_ONLY.answers ?? []).slice(0, 2),
  }
  assert.match(scoreNote(partial), /can go up/)
})

test('once a teacher has been through it, nothing is outstanding either way', () => {
  const marked: AssignmentResult = {
    ...CHOICE_ONLY,
    assignment: { id: 90, title: 'Assignment 1', is_graded: true },
    answers: [
      { question_id: 3, question_type: 'theory', points: 4, theory_answer: 'Because of erosion.' },
    ],
  }
  assert.doesNotMatch(scoreNote(marked), /can go up/)
})

test('an all-choice paper says the answer key marked it, not a teacher', () => {
  // `is_graded` means "something was filed", and on this paper nothing human
  // filed it: the server scored the choices and the teacher's portal filed the
  // same figures without anybody opening the script.
  const fields = Object.fromEntries(
    resultFields({
      ...CHOICE_ONLY,
      assignment: { id: 90, title: 'Assignment 1', is_graded: true },
    }).map((one) => [one.label, one.value]),
  )
  assert.equal(fields.Marked, 'From the answer key')
  assert.equal(fields['Marked by a teacher'], undefined)
})

test('a paper with writing on it still reports whether a person has been', () => {
  const written: AssignmentResult = {
    ...CHOICE_ONLY,
    score: { ...CHOICE_ONLY.score, total_questions: 1 },
    answers: [{ question_id: 3, question_type: 'theory', points: 4, theory_answer: 'Erosion.' }],
  }
  const fields = Object.fromEntries(resultFields(written).map((one) => [one.label, one.value]))
  assert.equal(fields['Marked by a teacher'], 'Not yet')
  assert.equal(fields.Marked, undefined)
})
