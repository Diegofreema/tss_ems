import type {
  AssignmentQuestion,
  QuestionBody,
  QuestionType,
} from '../../../../api/set-assignments/types.ts'

/**
 * One question of an assignment, as the teacher writing it works with.
 *
 * A question is one of two things and the difference runs through everything:
 * a multiple-choice question carries its own answer key and the school marks
 * it, and a theory question carries none and the teacher marks it by hand.
 * Nothing here lets an assignment hold a third kind — those are the two the API's
 * own questions come back as.
 */

export const TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: 'Multiple choice',
  theory: 'Theory',
}

export function typeLabel(type: string | null | undefined): string {
  return TYPE_LABEL[type as QuestionType] ?? 'Multiple choice'
}

export function isTheory(question: AssignmentQuestion): boolean {
  return question.question_type === 'theory'
}

/** The option the school will mark right, where the question has one. */
export function correctAnswer(question: AssignmentQuestion): string | null {
  const right = question.options?.find((option) => option.is_correct)
  return right?.option_text?.trim() || null
}

/** What the assignment is worth, added up from the questions themselves. */
export function totalMarks(questions: AssignmentQuestion[]): number {
  return questions.reduce((sum, question) => sum + (question.points ?? 0), 0)
}

/** What the question form holds while it is being filled in. */
export type QuestionValues = {
  question_text: string
  question_type: QuestionType
  points: string
  /** Ignored on a theory question, and kept so switching back does not lose it. */
  options: { option_text: string }[]
  /** Which option is the right one, as its index. Empty until one is marked. */
  correct: string
}

/** No choice marked yet. The radio group's value is a string, so this is one. */
export const NO_ANSWER = ''

/**
 * Which choice is marked as the answer, or null where none is.
 *
 * Read through this rather than with `Number`, which turns the unanswered
 * empty string into 0 — the first choice, silently, in every place that asks.
 */
export function correctIndex(correct: string): number | null {
  const typed = correct.trim()
  if (!typed) return null
  const index = Number(typed)
  return Number.isInteger(index) && index >= 0 ? index : null
}

/** How many choices a multiple-choice question must offer, and may. */
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 6

export const blankQuestion = (): QuestionValues => ({
  question_text: '',
  question_type: 'multiple_choice',
  points: '1',
  options: [{ option_text: '' }, { option_text: '' }],
  // Nothing marked. Starting on the first choice is a preselected answer key:
  // a teacher who writes four choices and forgets the radio has still filed a
  // question, and the one it marks right is whichever they happened to type
  // first — which the form never told them it had decided.
  correct: NO_ANSWER,
})

/** A question opened for editing, back in the shape the form fills in. */
export function questionValues(question: AssignmentQuestion): QuestionValues {
  const options = (question.options ?? []).map((option) => ({
    option_text: option.option_text ?? '',
  }))
  const right = (question.options ?? []).findIndex((option) => option.is_correct)

  return {
    question_text: question.question_text ?? '',
    question_type: isTheory(question) ? 'theory' : 'multiple_choice',
    points: String(question.points ?? 1),
    // A multiple-choice question saved with no options at all would open with
    // nothing to type into, so the form starts from the blank pair instead.
    options: options.length ? options : blankQuestion().options,
    // A question the school holds with no option marked opens with none marked
    // here either, so the teacher is asked for the key rather than handed one.
    correct: right === -1 ? NO_ANSWER : String(right),
  }
}

/**
 * What writing a question sends.
 *
 * A theory question sends no options: the API marks it by hand and an empty
 * `options` array on one is a key the school has no use for. On a
 * multiple-choice question `is_correct` is set on the right one alone, which
 * is how the API's own body writes it — the rest carry only their text.
 */
export function questionBody(values: QuestionValues): QuestionBody {
  const points = Number(String(values.points).replace(/[^0-9]/g, '')) || 0

  if (values.question_type === 'theory') {
    return {
      question_text: values.question_text.trim(),
      question_type: 'theory',
      points,
    }
  }

  // Null cannot reach here through the form, which refuses to submit until a
  // choice is marked — and if it ever did, no option carries the key rather
  // than the first one carrying it by accident.
  const correct = correctIndex(values.correct)
  return {
    question_text: values.question_text.trim(),
    question_type: 'multiple_choice',
    points,
    options: values.options
      .map((option, index) => ({ text: option.option_text.trim(), index }))
      .filter((option) => option.text)
      .map(({ text, index }) =>
        index === correct
          ? { option_text: text, is_correct: true as const }
          : { option_text: text },
      ),
  }
}

/**
 * What the confirm dialog reads back before a question goes on the paper.
 *
 * Built from `questionBody` rather than from the form's own values, and that
 * is the whole point of it: the teacher is shown **what is about to be sent**,
 * not a second rendering of what they typed. The two are not the same thing —
 * a blank choice is dropped on the way out, a theory question sheds its
 * choices entirely, and points are read through a filter that turns "3kg" into
 * 3. A read-back off the form would agree with the teacher and disagree with
 * the school.
 */
export type QuestionReview = {
  question: string
  kind: string
  points: number
  /** The choices as they will be saved, with the answer key marked. */
  choices: { text: string; correct: boolean }[]
  /** Who marks it, which is the difference the two kinds actually make. */
  marking: string
}

export function questionReview(values: QuestionValues): QuestionReview {
  const body = questionBody(values)

  return {
    question: body.question_text,
    kind: TYPE_LABEL[body.question_type],
    points: body.points,
    choices: (body.options ?? []).map((option) => ({
      text: option.option_text,
      correct: option.is_correct === true,
    })),
    marking:
      body.question_type === 'theory'
        ? 'You mark this one yourself once the assignment is sat.'
        : 'The school marks this one against the choice ticked.',
  }
}
