import { Check } from 'lucide-react'
import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { FileLink } from '@/components/common/file-link'
import { SectionHeading } from '@/components/common/section-heading'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PickerSpec } from './types'

/** The rows a flow acts on: class arms, pupils, documents on file. */
export function PickerList<TValues extends FieldValues>({
  name,
  picker,
}: {
  name: Path<TValues>
  picker: PickerSpec
}) {
  const { control, getValues } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const picked: string[] = field.value ?? []
  const allOn = picked.length === picker.items.length

  // Read the live value rather than this render's, so two taps in quick
  // succession both land — a lost pick here is an arm that never gets billed.
  const toggle = (key: string) => {
    const current: string[] = getValues(name) ?? []
    field.onChange(
      current.includes(key)
        ? current.filter((one) => one !== key)
        : [...current, key],
    )
  }

  return (
    <div className="mb-[26px]">
      <SectionHeading
        className="mb-3.5"
        action={
          picker.items.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="h-auto px-1 py-0 text-xs text-brand"
            onClick={() =>
              field.onChange(allOn ? [] : picker.items.map((item) => item.key))
            }
          >
            {allOn ? 'Clear all' : 'Select all'}
          </Button>
          )
        }
      >
        {picker.title}
      </SectionHeading>

      <div className="border-2 border-divider">
        {picker.items.map((item, index) => {
          const on = picked.includes(item.key)
          return (
            // A row with a file holds two controls, so the tick is its own
            // button rather than the whole row — a button cannot nest one.
            <div
              key={item.key}
              style={{ animationDelay: `${index * 26}ms` }}
              className={cn(
                'flex animate-ems-row items-center gap-3.5 border-b border-divider px-[15px] py-[13px] text-sm transition-colors last:border-b-0 hover:bg-neutral-200',
                on && 'bg-brand/9',
              )}
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(item.key)}
                className="flex flex-1 cursor-pointer items-center gap-3.5 text-left"
              >
                <span
                  className={cn(
                    'grid size-[18px] flex-none place-items-center border-2',
                    on ? 'border-brand bg-brand' : 'border-divider',
                  )}
                >
                  {on && (
                    <Check
                      className="size-3 text-white"
                      strokeWidth={3.4}
                    />
                  )}
                </span>
                <span className="flex-1 font-semibold">{item.label}</span>
              </button>
              {item.file ? (
                <FileLink name={item.file} className="text-xs" />
              ) : (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {item.meta}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div
        className={cn(
          'mt-2.5 text-xs',
          fieldState.error ? 'text-brand-700' : 'text-muted-foreground',
        )}
      >
        {fieldState.error?.message ?? picker.note}
      </div>
    </div>
  )
}
