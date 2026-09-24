import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApplicationStep } from '../schema'

/**
 * Where the applicant is in the form, and a way back to anything already done.
 *
 * Only steps already reached can be opened: jumping ahead would skip the
 * checks that stand between one step and the next, and the review step would
 * then read back a form half of which nobody had looked at.
 */
export function Stepper({
  steps,
  current,
  reached,
  onOpen,
}: {
  steps: readonly ApplicationStep[]
  current: number
  /** The furthest step the applicant has got to. */
  reached: number
  onOpen: (index: number) => void
}) {
  return (
    <>
      {/* A narrow column has no room for six labels: it says where you are. */}
      <div className="@3xl/apply:hidden">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-heading font-extrabold">{steps[current].title}</span>
          <span className="text-muted-foreground tabular-nums">
            Step {current + 1} of {steps.length}
          </span>
        </div>
        <div className="mt-2.5 flex gap-1.5" aria-hidden>
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                index <= current ? 'bg-brand' : 'bg-divider-strong',
              )}
            />
          ))}
        </div>
      </div>

      <nav aria-label="Application steps" className="hidden @3xl/apply:block">
        <ol className="relative">
          {steps.map((step, index) => {
            const done = index < current
            const here = index === current
            const open = index <= reached && !here
            return (
              <li key={step.id} className="relative pb-7 last:pb-0">
                {index < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-9 bottom-1 left-[15px] w-px transition-colors duration-300',
                      done ? 'bg-brand' : 'bg-divider-strong',
                    )}
                  />
                )}
                <button
                  type="button"
                  disabled={!open}
                  onClick={() => onOpen(index)}
                  aria-current={here ? 'step' : undefined}
                  className="group flex w-full items-start gap-3.5 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
                >
                  <span
                    className={cn(
                      'grid size-8 flex-none place-items-center rounded-full border text-xs font-bold tabular-nums transition-colors duration-300',
                      done && 'border-brand bg-brand text-white',
                      here && 'border-brand bg-raised text-brand ring-4 ring-brand/15',
                      !done && !here && 'border-divider-strong bg-raised text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="size-4" strokeWidth={2.6} /> : index + 1}
                  </span>
                  <span className="min-w-0 pt-1">
                    <span
                      className={cn(
                        'block text-sm font-semibold',
                        here ? 'text-foreground' : 'text-muted-foreground',
                        open && 'group-hover:text-foreground',
                      )}
                    >
                      {step.title}
                    </span>
                    {here && (
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {step.blurb}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
