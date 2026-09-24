import { Pencil } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { useApplyingClasses } from '@/api/departments/hooks'
import { useCountries, useLgas, useStates } from '@/api/places/hooks'
import { Button } from '@/components/ui/button'
import type { Option } from '@/features/collections/options'
import { formatDate } from '@/lib/format'
import { LABELS, STEPS, type ApplicationField, type ApplicationValues } from '../schema'

/**
 * The whole application read back, a step to a card, each with a way into the
 * step that asked it. The class and the places are read back by their names —
 * nobody recognises JSS I as 1, or Imo as 2663.
 */
export function Review({ onEdit }: { onEdit: (step: number) => void }) {
  const { getValues } = useFormContext<ApplicationValues>()
  const values = getValues()
  // The same queries the dropdowns ran, so these are already answered.
  const named: Partial<Record<ApplicationField, readonly Option[] | undefined>> = {
    department_id: useApplyingClasses().data,
    country_id: useCountries().data?.options,
    state_id: useStates(values.country_id).data,
    lga_id: useLgas(values.state_id).data,
  }

  const answer = (field: ApplicationField) => {
    const value = values[field]
    if (value instanceof Date) return formatDate(value)
    const list = named[field]
    if (list && value) return list.find((option) => option.value === value)?.label ?? value
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  }

  return (
    <div className="grid gap-4">
      {STEPS.slice(0, -1).map((step, index) => (
        <section key={step.id} className="rounded-xl bg-figure p-4 ring-1 ring-figure-edge">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-heading text-sm font-extrabold">{step.title}</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(index)}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </div>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-4 gap-y-3">
            {step.fields.map((field) => {
              const given = answer(field)
              return (
                <div key={field} className="min-w-0">
                  <dt className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {LABELS[field]}
                  </dt>
                  <dd className="mt-0.5 text-sm break-words">
                    {given ?? <span className="text-muted-foreground">Not given</span>}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      ))}
    </div>
  )
}
