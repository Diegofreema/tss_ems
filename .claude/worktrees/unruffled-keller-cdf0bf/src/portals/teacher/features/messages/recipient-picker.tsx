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
 * Who the message goes to: an arm, then the pupils in it.
 *
 * The selection is not cleared when the arm changes. A teacher who takes two
 * arms may well be writing to a few pupils from each, and losing the first
 * half on the way to the second would be the picker undoing their work.
 * `selectionNote` says how many are held outside the arm on screen so the
 * count never looks wrong.
 */
export function RecipientPicker({
  arms,
  armId,
  onArmChange,
  pupils,
  query,
  onQueryChange,
  chosen,
  onChange,
  error,
}: {
  arms: ArmOption[]
  armId: string
  onArmChange: (armId: string) => void
  pupils: Recipient[]
  query: string
  onQueryChange: (query: string) => void
  chosen: number[]
  onChange: (chosen: number[]) => void
  error?: string
}) {
  const shown = matching(pupils, query)
  const allShown = shown.length > 0 && shown.every((one) => chosen.includes(one.id))

  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
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
        <p className="border-2 border-divider px-4 py-5 text-[13px] text-muted-foreground">
          {pupils.length === 0
            ? 'No pupil sits in this arm yet. The office places pupils in arms.'
            : 'No pupil in this arm matches that search.'}
        </p>
      ) : (
        <ul className="max-h-[19rem] overflow-y-auto border-2 border-divider">
          {shown.map((pupil) => (
            <li key={pupil.id} className="border-b border-divider last:border-b-0">
              <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-foreground/5">
                <Checkbox
                  checked={chosen.includes(pupil.id)}
                  onCheckedChange={() => onChange(toggled(chosen, pupil.id))}
                />
                <span className="min-w-0 flex-1 truncate text-[13px]">{pupil.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {pupil.adm}
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
