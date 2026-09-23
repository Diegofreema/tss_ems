import { parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useState } from 'react';
import { SET, WRITE } from '@/db/ids';
import { enqueue } from '@/db/drain';
import { EmptyState } from '@/components/feedback/empty-state';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { PageHeader } from '@/components/page/page-header';
import { Rule } from '@/components/page/rule';
import { TileStrip } from '@/components/page/tile-strip';
import { Button } from '@/components/ui/button';
import { formatCount } from '@/lib/format';
import { NoArmsState } from './arms';
import {
  changedMarks,
  type Edits,
  isFuture,
  liveTally,
  registerRows,
} from './register';
import { RegisterFilters } from './register-filters';
import { RegisterSheet } from './register-sheet';
import { useMarkWords, useRegisterArms, useRegisterDay } from './use-register-day';

/**
 * The daily register: one arm, one day.
 *
 * Nothing is filed until the teacher saves, and only the rows they touched are
 * sent — a student left out is left alone by the endpoint, which is what makes a
 * half-finished register safe to leave.
 *
 * **There is no standing footnote under the sheet** (the teacher's call,
 * 2026-09-16). It explained that nobody had marked the day, that a pupil left
 * alone is left alone, and what the school means by late and excused — three
 * things at once, on every open, to somebody who has taken this register every
 * morning for a term. What it said is still true and still knowable: the tiles
 * count what is marked and what is not, each row says "Not marked" for itself,
 * and `useMarkWords`'s `note` is still read off `/attendances/statuses` for
 * whatever wants it next.
 */
export function RegisterPage() {
  const { options: marks } = useMarkWords();
  const [edits, setEdits] = useState<Edits>({});

  const [{ arm, date }, setQuery] = useQueryStates({
    arm: parseAsString.withDefault(''),
    date: parseAsString.withDefault(''),
  });

  const { arms, armId, pending: armsPending, none, unknown } = useRegisterArms(arm);
  const day = useRegisterDay(armId, date);

  const onArm = useCallback(
    (id: number) => {
      // Edits belong to the arm they were typed against; carrying them across
      // would file one class's marks onto another's roll.
      setEdits({});
      void setQuery({ arm: String(id) });
    },
    [setQuery],
  );
  const onDate = useCallback(
    (next: string) => void setQuery({ date: next }),
    [setQuery],
  );

  const header = <Header />;

  if (armsPending) {
    return (
      <>
        {header}
        <TableSkeleton rows={6} />
      </>
    );
  }

  // Nothing to mark, and a picker whose every choice ends in a 403 would be
  // worse than saying so.
  if (none) {
    return (
      <>
        {header}
        <NoArmsState />
      </>
    );
  }

  // Never synced on this device, so there is no roll to draw and no way to
  // find out what it is. Saying so beats a sheet with nobody on it.
  if (unknown) {
    return (
      <>
        {header}
        <EmptyState
          title="Your classes are not on this device"
          body="This register has not been opened here while you had a connection, so there is nothing to mark from yet. Open it once with a connection and it will work without one afterwards."
        />
      </>
    );
  }

  const rows = registerRows(day.pupils, edits);
  const tally = liveTally(rows, marks);
  const changed = changedMarks(rows);
  const count = Object.keys(changed).length;
  const future = isFuture(date);
  const inSchool = marks.find((mark) => mark.inSchool);
  const armLabel = arms.find((one) => one.id === armId)?.label ?? 'your class';

  const setMark = (studentId: number, status: string) =>
    setEdits((previous) => ({
      ...previous,
      [studentId]: { ...previous[studentId], status },
    }));

  /** Fills the blanks on screen. It files nothing — the teacher still saves. */
  const fillRest = () => {
    if (!inSchool) return;
    setEdits((previous) => {
      const next = { ...previous };
      for (const row of rows) {
        if (!row.status)
          next[row.student_id] = {
            ...next[row.student_id],
            status: inSchool.value,
          };
      }
      return next;
    });
  };

  /**
   * Written down on the device, and sent when there is somewhere to send it.
   *
   * The edits are cleared straight away, which the old mutation could not do:
   * they are not being thrown away, they are being moved somewhere durable.
   * The sheet reads the queue as well as the school, so the marks stay exactly
   * where they were on screen — through a page turn, a reload, a closed
   * browser and three days with no signal.
   */
  const submit = async () => {
    if (count === 0 || future) return;
    const outcome = await enqueue({
      handler: WRITE.takeRegister,
      payload: { class_arm_id: armId, date: day.date, marks: changed },
      collectionId: SET.registerDays,
      toast: { success: 'Register saved' },
      label: `Register for ${armLabel}, ${day.date}`,
    });
    /*
     * Cleared only where the marks are safe somewhere — at the school, or in
     * the queue on their way there. A refusal keeps them on the sheet exactly
     * as the teacher left them: the register is half an hour of somebody's
     * morning, and wiping it because the school said no would be the single
     * worst thing this screen could do.
     */
    if (outcome !== 'refused') setEdits({});
  };

  return (
    <>
      <Header
        action={
          <div className="flex flex-wrap gap-2.5">
            {inSchool && (
              <Button
                variant="outline"
                onClick={fillRest}
                disabled={tally.unmarked === 0}
              >
                Mark the rest {inSchool.label.toLowerCase()}
              </Button>
            )}
            <Button disabled={count === 0 || future} onClick={submit}>
              {count
                ? `Save ${count} mark${count === 1 ? '' : 's'}`
                : 'Save register'}
            </Button>
          </div>
        }
      />
      <Rule />

      <RegisterFilters
        arms={arms}
        armId={armId}
        date={date}
        onArm={onArm}
        onDate={onDate}
      />

      {future && (
        <div className="mb-5 rounded-lg border border-divider bg-brand/6 px-4 py-3.5 text-sm">
          That day has not happened yet. A register can only be taken for today
          or a day already gone.
        </div>
      )}

      {/* A sheet drawn from the roll alone. The endpoint leaves a student out
          of `marks` alone, so marking from one cannot erase anybody — but a
          teacher is owed the difference between "nobody marked this day" and
          "this device does not know who did". */}
      {!day.pending && !day.known && (
        <div className="mb-5 rounded-lg border border-divider bg-raised px-4 py-3.5 text-sm">
          The marks already filed for this day are not on this device, so this
          sheet is drawn from your roll. Anything you mark here is filed over
          what the school holds; anyone you leave alone stays as they are.
        </div>
      )}

      <TileStrip
        className="mb-5"
        tiles={[
          { label: 'On the roll', value: formatCount(tally.students) },
          { label: 'In school', value: formatCount(tally.inSchool) },
          ...tally.byStatus
            .filter((one) => !inSchool || one.value !== inSchool.value)
            .map((one) => ({
              label: one.label,
              value: formatCount(one.count),
            })),
          { label: 'Not marked', value: formatCount(tally.unmarked) },
        ]}
      />

      {day.pending ? (
        <TableSkeleton rows={6} />
      ) : rows.length ? (
        <RegisterSheet
          rows={rows}
          statuses={marks}
          waiting={day.waiting}
          onMark={setMark}
        />
      ) : (
        <EmptyState
          title="No students on this roll"
          body="The office places students in arms. Once one is placed here, they appear on this register."
        />
      )}
    </>
  );
}

function Header({ action }: { action?: React.ReactNode }) {
  return (
    <PageHeader
      kicker="Teaching"
      title="Take attendance"
      description="One arm, one day. Nothing is filed until you save, and only the students you mark are sent."
      action={action}
    />
  );
}
