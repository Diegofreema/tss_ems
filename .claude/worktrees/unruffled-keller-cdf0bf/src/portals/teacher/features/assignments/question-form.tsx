import { Plus, X } from 'lucide-react'
import { useFieldArray, useFormContext, FormProvider } from 'react-hook-form'
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
  MAX_OPTIONS,
  MIN_OPTIONS,
  type QuestionValues,
  TYPE_LABEL,
} from './question'

/**
 * Writing one question.
 *
 * The two kinds are one form rather than two, because switching between them
 * mid-thought is normal and the question itself is the same sentence either
 * way. What changes is only whether the choices are asked for — and they are
 * kept while a question is theory, so a teacher who switches by mistake does
 * not lose what they typed.
 */

const CHOICES = [
  { value: 'multiple_choice', label: TYPE_LABEL.multiple_choice },
  { value: 'theory', label: TYPE_LABEL.theory },
]

const schema = z
  .object({
    question_text: z.string().trim().min(1, 'Required'),
    question_type: z.enum(['multiple_choice', 'theory']),
    points: z
      .string()
      .trim()
      .refine((value) => /^\d+$/.test(value) && Number(value) > 0, 'A whole number, at least 1'),
    options: z.array(z.object({ option_text: z.string() })),
    correct: z.string(),
  })
  .superRefine((values, context) => {
    // A theory question has no choices to check: the teacher marks it later.
    if (values.question_type !== 'multiple_choice') return

    const filled = values.options.filter((option) => option.option_text.trim())
    if (filled.length < MIN_OPTIONS) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: `Write at least ${MIN_OPTIONS} choices`,
      })
    }
    // The marked choice must be one of the ones actually written: a blank
    // option is dropped before it is sent, and an answer key pointing at a
    // dropped option is a question the school can never mark right.
    if (!values.options[Number(values.correct)]?.option_text.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['correct'],
        message: 'Mark which choice is the right one',
      })
    }
  })

export function QuestionForm({
  values,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  values: QuestionValues
  submitLabel: string
  pending: boolean
  onSubmit: (values: QuestionValues) => void | Promise<void>
  onCancel: () => void
}) {
  const form = useRecordForm<QuestionValues>(schema, values)
  const kind = form.watch('question_type')

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="animate-ems-up mb-6 border-2 border-divider p-5"
      >
        <FormErrorBanner count={Object.keys(form.formState.errors).length} />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
          <TextField<QuestionValues>
            name="question_text"
            label="Question"
            required
            span="full"
            multiline
            placeholder="What is 2 + 2?"
          />
          <SelectField<QuestionValues>
            name="question_type"
            label="Kind"
            required
            options={CHOICES}
            hint={
              kind === 'theory'
                ? 'You mark this one yourself once the assignment is sat.'
                : 'The school marks this one against the answer you set.'
            }
          />
          <TextField<QuestionValues>
            name="points"
            label="Points"
            required
            type="number"
            hint="What the question is worth."
          />
        </div>

        {kind === 'multiple_choice' && <OptionList />}

        <div className="mt-6 flex gap-2.5">
          <Button type="submit" pending={pending}>
            {submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}

/**
 * The choices, and which of them is right.
 *
 * One control, not two: the radio that marks the answer sits on the choice it
 * marks, because "which of these is correct" is not a separate question from
 * "what are the choices" and a second dropdown asking it again is how an
 * answer key ends up pointing at a choice that was since rewritten.
 */
function OptionList() {
  const form = useFormContext<QuestionValues>()
  const { fields, append, remove } = useFieldArray<QuestionValues, 'options'>({
    control: form.control,
    name: 'options',
  })
  const correct = form.watch('correct')
  const error =
    form.formState.errors.options?.message ?? form.formState.errors.correct?.message

  return (
    <div className="mt-6">
      <Label className="mb-[5px] block text-xs font-normal text-foreground/70">
        Choices<span className="text-brand">*</span>
      </Label>

      <RadioGroup
        value={correct}
        onValueChange={(value) => form.setValue('correct', value)}
        className="gap-2"
      >
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2.5">
            <RadioGroupItem
              value={String(index)}
              id={`correct-${index}`}
              aria-label={`Choice ${index + 1} is the right answer`}
            />
            <Input
              {...form.register(`options.${index}.option_text`)}
              placeholder={`Choice ${index + 1}`}
              aria-invalid={Boolean(error)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              // Never below the two a multiple-choice question needs; the
              // button goes rather than refusing the click it invited.
              className={cn(fields.length <= MIN_OPTIONS && 'invisible')}
              onClick={() => {
                remove(index)
                // The answer is held as a position, so removing a choice above
                // it would otherwise move the key onto its neighbour.
                if (index < Number(correct)) {
                  form.setValue('correct', String(Number(correct) - 1))
                } else if (index === Number(correct)) {
                  form.setValue('correct', '0')
                }
              }}
              aria-label={`Remove choice ${index + 1}`}
            >
              <X />
            </Button>
          </div>
        ))}
      </RadioGroup>

      <div className="mt-2.5 flex items-center gap-3">
        {fields.length < MAX_OPTIONS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ option_text: '' })}
          >
            <Plus /> Add a choice
          </Button>
        )}
        <div className={cn('text-[11px]', error ? 'text-brand-700' : 'text-muted-foreground')}>
          {error ?? 'The one you mark is the answer the school marks against.'}
        </div>
      </div>
    </div>
  )
}
