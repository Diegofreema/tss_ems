import { SegmentedControl } from '@/components/common/segmented-control'
import { FilterBar } from '@/components/page/filter-bar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  allToggled,
  matching,
  selectionNote,
  toggled,
  type ArmOption,
  type Recipient,
} from './recipients'

/**
 * Who the message goes to: an arm, then the students in it.
 *
 * The selection is not cleared when the arm changes. A teacher who takes two
 * arms may well be writing to a few students from each, and losing the first
 * half on the way to the second would be the picker undoing their work.
 * `selectionNote` says how many are held outside the arm on screen so the
 * count never looks wrong.
 */
export function RecipientPicker({
  arms,
  armId,
  onArmChange,
  students,
  query,
  onQueryChange,
  chosen,
  onChange,
  error,
}: {
  arms: ArmOption[]
  armId: string
  onArmChange: (armId: string) => void
  students: Recipient[]
  query: string
  onQueryChange: (query: string) => void
  chosen: number[]
  onChange: (chosen: number[]) => void
  error?: string
}) {
  const shown = matching(students, query)
  const allShown = shown.length > 0 && shown.every((one) => chosen.includes(one.id))

  return (
    <div>
      <div className="mb-1.5 text-2xs uppercase tracking-label text-muted-foreground">
        To <span className="text-brand">*</span>
      </div>

      {arms.length > 1 && (
        <SegmentedControl
          name="arm"
          className="mb-3.5"
          value={armId}
          onChange={onArmChange}
          options={arms.map((arm) => ({
            value: arm.value,
            label: `${arm.label} · ${arm.count}`,
          }))}
        />
      )}

      <FilterBar
        query={query}
        onQueryChange={onQueryChange}
        placeholder="Search this arm by name or admission number"
        count={selectionNote(chosen, shown)}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={shown.length === 0}
          onClick={() => onChange(allToggled(chosen, shown))}
        >
          {allShown ? 'Clear these' : 'Select all'}
        </Button>
      </FilterBar>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-divider bg-raised px-4 py-5 text-sm text-muted-foreground">
          {students.length === 0
            ? 'No student sits in this arm yet. The office places students in arms.'
            : 'No student in this arm matches that search.'}
        </p>
      ) : (
        <ul className="max-h-76 overflow-y-auto rounded-lg border border-divider bg-raised">
          {shown.map((student) => (
            <li key={student.id} className="border-b border-divider last:border-b-0">
              <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-foreground/5">
                <Checkbox
                  checked={chosen.includes(student.id)}
                  onCheckedChange={() => onChange(toggled(chosen, student.id))}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{student.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {student.adm}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  )
}
