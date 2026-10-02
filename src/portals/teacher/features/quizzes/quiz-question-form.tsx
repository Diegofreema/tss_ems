import { FormProvider, useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { FormErrorBanner } from '@/components/form/form-error-banner'
import { SelectField } from '@/components/form/select-field'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useRecordForm } from '@/hooks/use-record-form'
import { cn } from '@/lib/utils'
import {
  MIN_OPTIONS,
  OPTION_SLOTS,
  QUIZ_KIND,
  type QuizQuestionValues,
  TRUE_FALSE,
} from './quiz-question'

/**
 * Writing one quiz question.
 *
 * The answer key is a radio on the option it marks, as on the assignment
 * questions form — "which is right" is not a separate question from "what are
 * the options". A true/false question has no boxes to fill: the school writes
 * its two options itself, so only which one is right is asked.
 */

const KINDS = [
  { value: 'multiple_choice', label: QUIZ_KIND.multiple_choice },
  { value: 'true_false', label: QUIZ_KIND.true_false },
]

const schema = z
  .object({
    question: z.string().trim().min(1, 'Required'),
    question_type: z.enum(['multiple_choice', 'true_false']),
    mark: z
      .string()
      .trim()
      .refine((value) => /^\d+$/.test(value) && Number(value) > 0, 'A whole number, at least 1'),
    options: z.array(z.string()),
    correct: z.string(),
  })
  .superRefine((values, context) => {
    if (values.question_type === 'true_false') {
      if (values.correct !== '1' && values.correct !== '2') {
        context.addIssue({ code: 'custom', path: ['correct'], message: 'Mark true or false' })
      }
      return
    }
    if (values.options.filter((text) => text.trim()).length < MIN_OPTIONS) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: `Write at least ${MIN_OPTIONS} options`,
      })
    }
    // The quiz marks itself: a question with no answer marks the whole class
    // wrong on it, which is why the school will not publish one.
    const chosen = Number(values.correct)
    if (!chosen || !values.options[chosen - 1]?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['correct'],
        message: 'Mark which option is right',
      })
    }
  })

export function QuizQuestionForm({
  values,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  values: QuizQuestionValues
  submitLabel: string
  /** Opens the read-back rather than writing, so this button waits on nothing. */
  onSubmit: (values: QuizQuestionValues) => void
  onCancel: () => void
}) {
  const form = useRecordForm<QuizQuestionValues>(schema, values)
  const kind = form.watch('question_type')

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="animate-ems-up mb-6 rounded-lg border border-divider bg-raised p-5 shadow-card"
      >
        <FormErrorBanner count={Object.keys(form.formState.errors).length} />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4.5">
          <TextField<QuizQuestionValues>
            name="question"
            label="Question"
            required
            span="full"
            multiline
            placeholder="What is 7 × 8?"
          />
          <SelectField<QuizQuestionValues>
            name="question_type"
            label="Kind"
            required
            options={KINDS}
            hint="Both are marked by the school the moment a pupil hands the quiz in."
          />
          <TextField<QuizQuestionValues>
            name="mark"
            label="Mark"
            required
            type="number"
            hint="What the question is worth."
          />
        </div>

        {kind === 'true_false' ? <TrueFalse /> : <Options />}

        <div className="mt-6 flex gap-2.5">
          <Button type="submit">{submitLabel}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

/** The four option boxes, and which of them is right. */
function Options() {
  const form = useFormContext<QuizQuestionValues>()
  const correct = form.watch('correct')
  const error = form.formState.errors.options?.message ?? form.formState.errors.correct?.message

  return (
    <div className="mt-6">
      <Label className="mb-1.25 block text-xs font-normal text-foreground/70">
        Options<span className="text-brand">*</span>
      </Label>
      <RadioGroup
        value={correct}
        onValueChange={(value) => form.setValue('correct', value)}
        className="gap-2"
      >
        {Array.from({ length: OPTION_SLOTS }, (_, index) => (
          <div key={index} className="flex items-center gap-2.5">
            <RadioGroupItem
              value={String(index + 1)}
              id={`quiz-correct-${index}`}
              aria-label={`Option ${index + 1} is the right answer`}
            />
            <Input
              {...form.register(`options.${index}`)}
              placeholder={index < MIN_OPTIONS ? `Option ${index + 1}` : `Option ${index + 1} (optional)`}
              aria-invalid={Boolean(error)}
            />
          </div>
        ))}
      </RadioGroup>
      <div className={cn('mt-2.5 text-2xs', error ? 'text-danger-ink' : 'text-muted-foreground')}>
        {error ?? 'Up to four options. The one you mark is what the school marks against.'}
      </div>
    </div>
  )
}

/** True or false: only which one is right is asked. */
function TrueFalse() {
  const form = useFormContext<QuizQuestionValues>()
  const correct = form.watch('correct')
  const error = form.formState.errors.correct?.message

  return (
    <div className="mt-6">
      <Label className="mb-1.25 block text-xs font-normal text-foreground/70">
        The answer<span className="text-brand">*</span>
      </Label>
      <RadioGroup
        value={correct}
        onValueChange={(value) => form.setValue('correct', value)}
        className="flex gap-6"
      >
        {TRUE_FALSE.map((label, index) => (
          <label key={label} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={String(index + 1)} aria-label={label} />
            {label}
          </label>
        ))}
      </RadioGroup>
      <div className={cn('mt-2.5 text-2xs', error ? 'text-danger-ink' : 'text-muted-foreground')}>
        {error ?? 'The school writes the two options itself.'}
      </div>
    </div>
  )
}
