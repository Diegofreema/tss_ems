import { parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useState } from 'react';
import {
  useRegister,
  useRegisterStatuses,
  useTakeRegister,
} from '@/api/attendance/hooks';
import type { SavedRegister } from '@/api/attendance/types';
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
  ignoredNote,
  isFuture,
  liveTally,
  registerRows,
  statusOptions,
} from './register';
import { RegisterFilters } from './register-filters';
import { RegisterSheet } from './register-sheet';
import { useRegisterArms } from './use-register-arms';

/**
 * The daily register: one arm, one day.
 *
 * Nothing is filed until the teacher saves, and only the rows they touched are
 * sent — a pupil left out is left alone by the endpoint, which is what makes a
 * half-finished register safe to leave.
 */
export function RegisterPage() {
  const statuses = useRegisterStatuses();
  const save = useTakeRegister();
  const [edits, setEdits] = useState<Edits>({});
  const [saved, setSaved] = useState<SavedRegister>();

  const [{ arm, date }, setQuery] = useQueryStates({
    arm: parseAsString.withDefault(''),
    date: parseAsString.withDefault(''),
  });

  const { arms, armId, pending: armsPending, none } = useRegisterArms(arm);
  const day = useRegister(
    armId ? { class_arm_id: armId, ...(date ? { date } : {}) } : null,
  );

  const onArm = useCallback(
    (id: number) => {
      // Edits belong to the arm they were typed against; carrying them across
      // would file one class's marks onto another's roll.
      setEdits({});
      setSaved(undefined);
      void setQuery({ arm: String(id) });
    },
    [setQuery],
  );
  const onDate = useCallback(
    (next: string) => void setQuery({ date: next }),
    [setQuery],
  );

  const header = <Header />;

  if (armsPending || statuses.isPending) {
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

  const marks = statusOptions(statuses.data);
  const rows = registerRows(day.data?.pupils ?? [], edits);
  const tally = liveTally(rows, marks);
  const pending = changedMarks(rows);
  const count = Object.keys(pending).length;
  const future = isFuture(date);
  const inSchool = marks.find((mark) => mark.inSchool);
  const ignored = ignoredNote(saved);

  const setMark = (studentId: number, status: string) =>
    setEdits((previous) => ({
      ...previous,
      [studentId]: { ...previous[studentId], status },
    }));

  const setNote = (studentId: number, notes: string) =>
    setEdits((previous) => ({
      ...previous,
      [studentId]: { ...previous[studentId], notes },
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

  const submit = async () => {
    if (!day.data || count === 0 || future) return;
    const answer = await save
      .mutateAsync({ class_arm_id: armId, date: day.data.date, marks: pending })
      // A refusal has already been announced by the mutation cache; what was
      // filed before it stays filed, and the register is re-read either way.
      .catch(() => undefined);
    if (answer) setSaved(answer);
    setEdits({});
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
            <Button
              pending={save.isPending}
              disabled={count === 0 || future}
              onClick={submit}
            >
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
        <div className="mb-5 border-2 border-brand px-4 py-3.5 text-[13px]">
          That day has not happened yet. A register can only be taken for today
          or a day already gone.
        </div>
      )}

      {ignored && (
        <div className="mb-5 border-2 border-divider px-4 py-3.5 text-[13px]">
          {ignored}
        </div>
      )}

      <TileStrip
        className="mb-5"
        tiles={[
          { label: 'On the roll', value: formatCount(tally.pupils) },
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

      {day.isPending ? (
        <TableSkeleton rows={6} />
      ) : rows.length ? (
        <RegisterSheet
          rows={rows}
          statuses={marks}
          onMark={setMark}
          onNote={setNote}
        />
      ) : (
        <EmptyState
          title="No pupils on this roll"
          body="The office places pupils in arms. Once one is placed here, they appear on this register."
        />
      )}

      <p className="mt-3.5 text-xs text-muted-foreground">
        {day.data?.taken
          ? 'This register has been taken. Changing a mark files the change over it.'
          : 'Nobody has marked this day yet.'}{' '}
        A pupil you leave alone stays as they are — nothing here marks anyone
        absent by default.
        {/* The school's own sentence about what its words mean, rather than
            this page's paraphrase of it. */}
        {statuses.data?.note && <> {statuses.data.note}</>}
      </p>
    </>
  );
}

function Header({ action }: { action?: React.ReactNode }) {
  return (
    <PageHeader
      kicker="Teaching"
      title="Take attendance"
      description="One arm, one day. Nothing is filed until you save, and only the pupils you mark are sent."
      action={action}
    />
  );
}
