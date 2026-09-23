import { cn } from '@/lib/utils'

export type Bar = {
  label: string
  value: number
  /** Caption above the bar, e.g. "₦14.2m". */
  display: string
  /** Renders in accent instead of ink — used to flag a month or a weak arm. */
  highlight?: boolean
}

/** Flat vertical bars that grow from the baseline on mount. */
export function BarChart({ bars, peak }: { bars: Bar[]; peak: number }) {
  return (
    <>
      <div className="mt-4.5 flex h-[190px] items-end gap-0.5 border-b-2 border-divider">
        {bars.map((bar, index) => (
          <div
            key={bar.label}
            className="flex h-full flex-1 flex-col justify-end gap-1.5"
          >
            <div className="text-center text-2xs tabular-nums text-neutral-600">
              {bar.display}
            </div>
            <div
              style={{
                height: `${Math.round((bar.value / peak) * 150)}px`,
                animationDelay: `${index * 60}ms`,
              }}
              className={cn(
                'origin-bottom animate-ems-grow transition-colors duration-200 hover:bg-brand',
                bar.highlight ? 'bg-brand' : 'bg-neutral-800',
              )}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-0.5">
        {bars.map((bar) => (
          <div
            key={bar.label}
            className="flex-1 text-center text-2xs uppercase tracking-[0.04em] text-neutral-600"
          >
            {bar.label}
          </div>
        ))}
      </div>
    </>
  )
}
