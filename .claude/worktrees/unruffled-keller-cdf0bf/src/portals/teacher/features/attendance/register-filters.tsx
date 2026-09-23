import { useEffect } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { DateField } from '@/components/form/date-field';
import { fromApiDate, toApiDate } from '@/features/collections/date-range';
import { ArmPicker } from './arms';
import type { ClassOption } from './register';

type Day = { day?: Date };

/**
 * Which arm, and which day.
 *
 * The day is bounded to the past, because a register for a day that has not
 * happened is refused. It opens on whatever the URL carries, so a day opened
 * from the registers-taken page arrives already chosen.
 */
export function RegisterFilters({
  arms,
  armId,
  date,
  onArm,
  onDate,
}: {
  arms: ClassOption[];
  armId: number;
  date: string;
  onArm: (id: number) => void;
  onDate: (date: string) => void;
}) {
  const form = useForm<Day>({ defaultValues: { day: fromApiDate(date) } });
  const values = useWatch({ control: form.control });

  useEffect(() => {
    onDate(toApiDate(values.day) ?? '');
  }, [values.day, onDate]);

  return (
    <div className="mb-5 flex flex-wrap items-end gap-5">
      <ArmPicker arms={arms} armId={armId} onArm={onArm} />
      <FormProvider {...form}>
        <form
          className="min-w-[220px]"
          onSubmit={(event) => event.preventDefault()}
        >
          <DateField<Day> name="day" label="Day" past placeholder="Today" />
        </form>
      </FormProvider>
    </div>
  );
}
