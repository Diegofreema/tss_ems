import { Link } from '@tanstack/react-router';
import { parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useEffect } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useCoverage } from '@/api/attendance/hooks';
import { TableSkeleton } from '@/components/feedback/table-skeleton';
import { DateField } from '@/components/form/date-field';
import { PageHeader } from '@/components/page/page-header';
import { Rule } from '@/components/page/rule';
import { TileStrip } from '@/components/page/tile-strip';
import {
  fromApiDate,
  rangeLabel,
  toApiDate,
} from '@/features/collections/date-range';
import { formatCount } from '@/lib/format';
import { ArmPicker, NoArmsState } from './arms';
import { missingDays } from './register';
import { useRegisterArms } from './use-register-arms';

type Range = { from?: Date; to?: Date };

/**
 * Which registers this arm had taken over a period — and, more usefully, which
 * were never taken at all.
 *
 * Not who was absent: a day nobody marked and a day everybody stayed home look
 * identical in an attendance report, and only this endpoint tells them apart.
 * Weekends are not counted as missing.
 *
 * Its own page rather than a panel under the register: marking today's roll and
 * auditing a month of them are two jobs, and a missing day here opens the
 * register on that day rather than making this page a second place to mark.
 */
export function CoveragePage() {
  const [{ arm, from, to }, setQuery] = useQueryStates({
    arm: parseAsString.withDefault(''),
    from: parseAsString.withDefault(''),
    to: parseAsString.withDefault(''),
  });

  const { arms, armId, pending, none } = useRegisterArms(arm);
  const { data } = useCoverage(
    armId
      ? { class_arm_id: armId, ...(from ? { from } : {}), ...(to ? { to } : {}) }
      : null,
  );

  const onArm = useCallback(
    (id: number) => void setQuery({ arm: String(id) }),
    [setQuery],
  );

  const header = (
    <PageHeader
      kicker="Teaching"
      title="Registers taken"
      description="Which days this arm was marked at all, over a period. Weekends are not counted. Open a missing day to take it late."
    />
  );

  if (pending) {
    return (
      <>
        {header}
        <TableSkeleton rows={4} />
      </>
    );
  }

  if (none) {
    return (
      <>
        {header}
        <NoArmsState />
      </>
    );
  }

  const missing = missingDays(data);
  // The dates the endpoint actually used, which are not always the ones asked
  // for — an empty range is its own choice, and it says which.
  const covered = rangeLabel(data?.from ?? '', data?.to ?? '');

  return (
    <>
      {header}
      <Rule />

      <div className="mb-5 flex flex-wrap items-end gap-5">
        <ArmPicker arms={arms} armId={armId} onArm={onArm} />
        <RangeFields from={from} to={to} onRange={setQuery} />
      </div>

      <TileStrip
        className="mb-3"
        tiles={[
          { label: 'School days', value: formatCount(data?.school_days ?? 0) },
          { label: 'Registers taken', value: formatCount(data?.taken ?? 0) },
          { label: 'Never taken', value: formatCount(data?.missing_count ?? 0) },
        ]}
      />

      {covered && (
        <p className="mb-3 text-[12.5px] text-muted-foreground">
          Counting {covered}.
        </p>
      )}

      {missing.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {missing.map((day) => (
            <Link
              key={day.iso}
              to="/teacher/attendance"
              // The arm as a number, so the router writes `arm=16` rather than
              // a quoted string the page would read back as no arm at all.
              search={{ arm: armId, date: day.iso }}
              className="border-2 border-divider px-2.5 py-1.5 text-[12.5px] text-foreground transition-colors hover:border-brand hover:text-brand-700"
            >
              {day.label}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Every school day in this range has a register.
        </p>
      )}
    </>
  );
}

/** The period asked about, kept in the URL so a range can be sent to someone. */
function RangeFields({
  from,
  to,
  onRange,
}: {
  from: string;
  to: string;
  onRange: (next: { from: string; to: string }) => void;
}) {
  const form = useForm<Range>({
    defaultValues: { from: fromApiDate(from), to: fromApiDate(to) },
  });
  const values = useWatch({ control: form.control });

  useEffect(() => {
    onRange({
      from: toApiDate(values.from) ?? '',
      to: toApiDate(values.to) ?? '',
    });
  }, [values.from, values.to, onRange]);

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-wrap gap-[18px]"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="min-w-[200px]">
          <DateField<Range>
            name="from"
            label="From"
            past
            placeholder="Last 30 days"
          />
        </div>
        <div className="min-w-[200px]">
          <DateField<Range> name="to" label="To" past placeholder="Today" />
        </div>
      </form>
    </FormProvider>
  );
}
