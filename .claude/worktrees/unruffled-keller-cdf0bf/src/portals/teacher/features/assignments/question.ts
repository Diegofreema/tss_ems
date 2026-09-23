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
  /** Which option is the right one, as its index. */
  correct: string
}

/** How many choices a multiple-choice question must offer, and may. */
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 6

export const blankQuestion = (): QuestionValues => ({
  question_text: '',
  question_type: 'multiple_choice',
  points: '1',
  options: [{ option_text: '' }, { option_text: '' }],
  correct: '0',
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
    correct: String(right === -1 ? 0 : right),
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

  const correct = Number(values.correct)
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
