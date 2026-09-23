import { Check, X } from 'lucide-react';
import { useMemo } from 'react';
import { FormProvider, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import type {
  MarkedSubmission,
  MarkingAnswer,
} from '@/api/set-assignments/types';
import { Tag } from '@/components/common/tag';
import { FormErrorBanner } from '@/components/form/form-error-banner';
import { TextField } from '@/components/form/text-field';
import { TileStrip } from '@/components/page/tile-strip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecordForm } from '@/hooks/use-record-form';
import { cn } from '@/lib/utils';
import {
  answerKey,
  choiceCount,
  chosenOption,
  correctOption,
  isTheory,
  maxTotal,
  needsHand,
  openingScores,
  rightCount,
  runningTotal,
  wasRight,
} from './marking';

/**
 * Marking one submission.
 *
 * Every answer is shown, not only the ones to mark: a teacher deciding what a
 * written answer is worth reads the whole assignment, and hiding the multiple
 * choice would hide the half the school has already decided. Only the theory
 * answers carry a box.
 */

export type MarkingValues = { scores: Record<string, string>; comment: string };

/** What each answer may be given, so a mark over the question's own worth is refused. */
function schemaFor(answers: MarkingAnswer[]) {
  const caps = new Map(
    needsHand(answers).map((answer) => [answerKey(answer), answer.points ?? 0]),
  );

  return z
    .object({
      scores: z.record(z.string(), z.string()),
      comment: z.string(),
    })
    .superRefine((values, context) => {
      for (const [key, cap] of caps) {
        const typed = (values.scores[key] ?? '').trim();
        // A box left empty is a mark not given yet; save decides it is nought.
        if (!typed) continue;
        if (!/^\d+$/.test(typed)) {
          context.addIssue({
            code: 'custom',
            path: ['scores', key],
            message: 'A whole number',
          });
        } else if (Number(typed) > cap) {
          context.addIssue({
            code: 'custom',
            path: ['scores', key],
            message: `This question is worth ${cap}`,
          });
        }
      }
    });
}

export function MarkingSheet({
  submission,
  marked,
  pending,
  onSave,
}: {
  submission: MarkedSubmission;
  marked: boolean;
  pending: boolean;
  onSave: (values: MarkingValues) => void | Promise<void>;
}) {
  const answers = submission.answers ?? [];
  // Off the payload's own array rather than the fallback above it, which is a
  // new empty array on every render and would rebuild the validator each time.
  const schema = useMemo(
    () => schemaFor(submission.answers ?? []),
    [submission.answers],
  );
  const form = useRecordForm<MarkingValues>(schema, {
    scores: openingScores(answers),
    comment: submission.submission?.teacher_comments ?? '',
  });
  const scores = form.watch('scores');
  const hand = needsHand(answers);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSave)} noValidate>
        <TileStrip
          className="mb-5"
          tiles={[
            {
              label: 'This submission',
              value: `${runningTotal(answers, scores)} of ${maxTotal(answers)}`,
            },
            {
              label: 'Multiple choice right',
              value: `${rightCount(answers)} of ${choiceCount(answers)}`,
            },
            { label: 'Written answers to mark', value: String(hand.length) },
          ]}
        />

        <FormErrorBanner count={Object.keys(form.formState.errors).length} />

        <ol className="grid gap-2.5">
          {answers.map((answer, index) => (
            <AnswerCard
              key={answerKey(answer)}
              answer={answer}
              position={index + 1}
            />
          ))}
        </ol>

        {answers.length === 0 && (
          <p className="border-2 border-divider px-6 py-10 text-center text-sm text-muted-foreground">
            This submission came back with no answers on it.
          </p>
        )}

        <div className="mt-6 max-w-140">
          <TextField<MarkingValues>
            name="comment"
            label="A note for the pupil"
            multiline
            placeholder="Good work."
            hint="Read on their own result page, beside the mark."
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" pending={pending}>
            {marked ? 'Save the correction' : 'Save the marks'}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            {hand.length === 0
              ? 'The multiple choice is marked against the answer key already — check it and save.'
              : 'The multiple choice is filled in from the answer key; the written answers are yours. A box left empty is saved as nought.'}
          </span>
        </div>
      </form>
    </FormProvider>
  );
}

/** One answer: what was given, what was right, and what it is worth. */
function AnswerCard({
  answer,
  position,
}: {
  answer: MarkingAnswer;
  position: number;
}) {
  const points = answer.points ?? 0;
  const theory = isTheory(answer);
  const chose = chosenOption(answer);
  const right = correctOption(answer);
  const correct = wasRight(answer);

  return (
    <li className="border-2 border-divider p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="font-heading text-sm font-extrabold tabular-nums text-muted-foreground">
            {position}.
          </span>
          <div>
            <p className="text-sm">
              {answer.question?.trim() || `Question ${answer.question_id}`}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag>{theory ? 'Theory' : 'Multiple choice'}</Tag>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {points} point{points === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {correct !== null &&
            (correct ? (
              <Check
                className="size-4 text-brand"
                aria-label="Matches the answer key"
              />
            ) : (
              <X
                className="size-4 text-muted-foreground"
                aria-label="Does not match the answer key"
              />
            ))}
          <AnswerScore answer={answer} cap={points} />
        </div>
      </div>

      <div className="mt-3 pl-7 text-[13px]">
        {theory ? (
          <p
            className={cn(
              'whitespace-pre-wrap',
              answer.theory_answer?.trim()
                ? 'text-foreground'
                : 'text-muted-foreground',
            )}
          >
            {answer.theory_answer?.trim() || 'Nothing was written.'}
          </p>
        ) : (
          <div className="grid gap-1 text-muted-foreground">
            <div>
              Chose:{' '}
              <span className="text-foreground">{chose || 'Nothing'}</span>
            </div>
            {/* Only where it adds something: on a right answer the two lines
                would say the same word twice. */}
            {correct !== true && right && <div>Answer: {right}</div>}
          </div>
        )}
      </div>
    </li>
  );
}

/** What this answer was worth to the pupil. Every answer carries one. */
function AnswerScore({ answer, cap }: { answer: MarkingAnswer; cap: number }) {
  const key = answerKey(answer);
  const name = `scores.${key}` as const;
  const form = useFormContext<MarkingValues>();
  const error = form.formState.errors.scores?.[key]?.message;

  return (
    <div className="w-[132px]">
      <Label
        htmlFor={name}
        className="mb-[5px] block text-xs font-normal text-foreground/70"
      >
        Mark out of {cap}
      </Label>
      <Input
        id={name}
        type="number"
        inputMode="numeric"
        aria-invalid={Boolean(error)}
        {...form.register(name)}
      />
      {error && (
        <div className="mt-1 text-[11px] text-brand-700">{String(error)}</div>
      )}
    </div>
  );
}
