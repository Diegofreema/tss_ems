import { SegmentedControl } from '@/components/common/segmented-control';
import { EmptyState } from '@/components/feedback/empty-state';
import type { ClassOption } from './register';

/**
 * Which arm. Only the ones this teacher takes a register for are offered — a
 * picker that offered the class they merely teach would be an invitation to a
 * 403.
 */
export function ArmPicker({
  arms,
  armId,
  onArm,
}: {
  arms: ClassOption[];
  armId: number;
  onArm: (id: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-2xs uppercase tracking-label text-muted-foreground">
        Arm
      </div>
      <SegmentedControl
        name="arm"
        value={String(armId)}
        options={arms.map((arm) => ({
          value: String(arm.id),
          label: `${arm.label} · ${arm.roll}`,
        }))}
        onChange={(value) => onArm(Number(value))}
      />
    </div>
  );
}

/** Said once, for both pages: neither has anything to show this teacher. */
export function NoArmsState() {
  return (
    <EmptyState
      title="You do not take a register"
      body="The class teacher of an arm marks its roll, not every teacher who teaches the class. Ask the school office to make you class teacher of an arm if this is wrong."
    />
  );
}
