import { Search } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import type { Option } from '@/features/collections/options'
import { useDebounced } from '@/hooks/use-debounced'
import { cn } from '@/lib/utils'
import { StudentPerformance } from './student-performance'

/**
 * Finding one student, then reading their progress.
 *
 * Two ways of finding, because the two portals hold different registers. The
 * office searches the whole school, which is a request per settled keystroke
 * and has to be — the endpoint searches a register this device holds at most
 * the first couple of hundred of. A teacher picks off their own roll, which is
 * already on the device, so their search is a filter and costs nothing.
 *
 * Which student is being read lives in the URL, so the view is shareable and
 * survives a reload — and so that coming back from a student's record lands on
 * the same one rather than on an empty box.
 */
export function StudentLookup({
  options,
  pending,
  onTerm,
  hint,
}: {
  options: Option[]
  pending: boolean
  /**
   * Given where the register is searched at the school. Left out where the
   * whole list is already here, in which case the box filters it.
   */
  onTerm?: (term: string) => void
  hint: string
}) {
  const [student, setStudent] = useQueryState('student', parseAsString.withDefault(''))
  const [term, setTerm] = useState('')
  const settled = useDebounced(term)

  // Told to the caller only once the typing has settled, so a search costs one
  // request rather than one per keystroke.
  useEffect(() => {
    onTerm?.(settled)
  }, [settled, onTerm])

  const shown = useMemo(() => {
    if (onTerm) return options
    const needle = settled.trim().toLowerCase()
    if (!needle) return options.slice(0, 50)
    return options.filter((one) => one.label.toLowerCase().includes(needle)).slice(0, 50)
  }, [options, settled, onTerm])

  const chosen = options.find((one) => one.value === student)

  return (
    <div className="grid gap-5 @3xl/page:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-xl border border-divider bg-raised shadow-card">
        <div className="relative border-b border-divider p-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by name or admission number"
            aria-label="Search for a student"
            className="pl-8"
          />
        </div>

        <div className="max-h-[26rem] overflow-y-auto">
          {pending ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Looking&hellip;
            </p>
          ) : shown.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {term ? `No student matches “${term}”.` : hint}
            </p>
          ) : (
            <ul className="divide-y divide-divider">
              {shown.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => void setStudent(option.value)}
                    aria-pressed={option.value === student}
                    className={cn(
                      'block w-full cursor-pointer px-4 py-2.5 text-left text-sm transition-colors',
                      option.value === student ? 'bg-brand/10' : 'hover:bg-foreground/5',
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        {student ? (
          <>
            {chosen && (
              <h3 className="mb-4 font-heading text-lg font-extrabold">
                {chosen.label}
              </h3>
            )}
            <StudentPerformance key={student} studentId={Number(student)} canScope />
          </>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-divider px-6 py-16 text-center">
            <div className="max-w-[38ch]">
              <div className="font-heading text-base font-extrabold">
                Choose a student
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Their terms, every subject against their own average, and their
                attendance over the same period.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
