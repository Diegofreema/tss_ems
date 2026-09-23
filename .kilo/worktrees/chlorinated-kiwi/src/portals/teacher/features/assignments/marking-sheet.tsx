import { Check, X } from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';
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
import { isRichText } from '@/features/collections/rich-text';
import { useRecordForm } from '@/hooks/use-record-form';
import {
  answerKey,
  choiceCount,
  chosenOption,
  correctOption,
  isChoice,
  maxTotal,
  keyScore,
  needsHand,
  openingScores,
  overruled,
  rightCount,
  runningTotal,
  wasRight,
} from './marking';

/**
 * The reader is the editor with typing turned off, fetched only by a paper
 * with a theory answer on it — and it is also what sanitises the answer: the
 * markup is parsed against the schema in `@/components/editor/extensions`
 * rather than set as HTML on an element.
 */
const RichTextView = lazy(() =>
  import('@/components/editor/rich-text-view').then((module) => ({
    default: module.RichTextView,
  })),
);

/**
 * Marking one submission.
 *
 * Every answer is shown, not only the ones to mark: a teacher deciding what a
 * written answer is worth reads the whole assignment, and hiding the multiple
 * choice would hide the half already settled.
 *
 * **Only the written answers carry a box.** A multiple-choice mark is read off
 * the answer key and stated, not offered — the student picked an option and
 * the assignment says which one is right, so there is nothing for a person to
 * decide. Its mark is still in `scores` and still sent: the school scores
 * nothing itself, so an answer left out of the payload is an answer left
 * unmarked.
 */

export type MarkingValues = { scores: Record<string, string>; comment: string };

/**
 * What a written answer may be given, so a mark over the question's own worth
 * is refused — 50 on a question worth 2 is a total the school will keep.
 */
function schemaFor(answers: MarkingAnswer[]) {
  // The written ones alone: a choice mark is not typed, so it cannot be wrong,
  // and an error message under a figure nobody can change would be a complaint
  // about this app's own arithmetic.
  const caps = new Map(
    answers
      .filter((answer) => !isChoice(answer))
      .map((answer) => [answerKey(answer), answer.points ?? 0]),
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
          <p className="rounded-xl border border-divider bg-raised px-6 py-10 text-center text-sm text-muted-foreground">
            This submission came back with no answers on it.
          </p>
        )}

        <div className="mt-6 max-w-140">
          <TextField<MarkingValues>
            name="comment"
            label="A note for the student"
            multiline
            placeholder="Good work."
            hint="Read on their own result page, beside the mark."
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" pending={pending}>
            {marked ? 'Save' : 'Save the marks'}
          </Button>
          <span className="text-2xs text-muted-foreground">
            {hand.length === 0
              ? 'Every answer here is multiple choice, so all of it is marked from the answer key — there is nothing to mark by hand. Save to file it.'
              : 'The multiple choice is marked from the answer key; the written answers are yours. A box left empty is saved as nought.'}
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
  // Marked against the key, or read by hand — the same rule the opening marks
  // are filled in by, so what the card says matches what the box holds.
  const theory = !isChoice(answer);
  const chose = chosenOption(answer);
  const right = correctOption(answer);
  const correct = wasRight(answer);

  return (
    <li className="rounded-lg border border-divider bg-raised p-4">
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
              <span className="text-2xs tabular-nums text-muted-foreground">
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
          {theory ? (
            <AnswerScore answer={answer} cap={points} />
          ) : (
            <KeyScore answer={answer} cap={points} />
          )}
        </div>
      </div>

      <div className="mt-3 pl-7 text-sm">
        {theory ? (
          <TheoryAnswer written={answer.theory_answer?.trim() ?? ''} />
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

/**
 * What the student wrote.
 *
 * The theory box is the editor now, so an answer sat since is HTML and one sat
 * before it is the sentence they typed. Which it is has to be asked rather
 * than assumed: drawing the first as text puts `<p>` in front of the teacher
 * marking it, and drawing the second through the editor is a paragraph either
 * way. `whitespace-pre-wrap` belongs to the plain branch alone — written
 * markup carries its own paragraphs, and pre-wrap on top doubles every gap.
 */
function TheoryAnswer({ written }: { written: string }) {
  if (!written) {
    return <p className="text-muted-foreground">Nothing was written.</p>;
  }
  if (isRichText(written)) {
    return (
      <Suspense fallback={<div className="h-5 animate-ems-fade" />}>
        <RichTextView html={written} />
      </Suspense>
    );
  }
  return <p className="whitespace-pre-wrap text-foreground">{written}</p>;
}

/**
 * A multiple-choice mark: stated, not asked for.
 *
 * Drawn in the same place and to the same width as the written answer's box,
 * so a teacher reading down the sheet sees one column of marks rather than two
 * kinds of thing — but as text on the ground rather than a field, which is the
 * difference somebody notices before they try to type in it.
 *
 * The figure is `keyScore` rather than the box's value because it is not in a
 * box; both are the same number, since `openingScores` fills the form from the
 * same function.
 */
function KeyScore({ answer, cap }: { answer: MarkingAnswer; cap: number }) {
  const given = keyScore(answer) ?? 0;
  const replaced = overruled(answer);

  return (
    <div className="w-33">
      <span className="mb-1.25 block text-xs font-normal text-foreground/70">
        Mark out of {cap}
      </span>
      <div className="flex h-11 items-center rounded-lg bg-ui-field px-4 text-[15px] tabular-nums">
        {given}
      </div>
      <div className="mt-1 text-2xs text-muted-foreground">
        {/* Said out loud rather than left to happen: this mark is on file and
            saving replaces it. Only ever shown for a submission marked by hand
            before the key became the authority. */}
        {replaced === null
          ? 'From the answer key'
          : `From the answer key. ${replaced} is on file; saving replaces it.`}
      </div>
    </div>
  );
}

/** What this written answer was worth to the student. */
function AnswerScore({ answer, cap }: { answer: MarkingAnswer; cap: number }) {
  const key = answerKey(answer);
  const name = `scores.${key}` as const;
  const form = useFormContext<MarkingValues>();
  const error = form.formState.errors.scores?.[key]?.message;

  return (
    <div className="w-33">
      <Label
        htmlFor={name}
        className="mb-1.25 block text-xs font-normal text-foreground/70"
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
        <div className="mt-1 text-2xs text-danger-ink">{String(error)}</div>
      )}
    </div>
  );
}
