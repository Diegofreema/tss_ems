import { cn } from '@/lib/utils'

export type Bar = {
  label: string
  value: number
  /** Caption above the bar, e.g. "₦14.2m". */
  display: string
  /** Renders in full accent instead of the tint — the month or arm to notice. */
  highlight?: boolean
}

/**
 * Vertical bars that grow from the baseline on mount.
 *
 * The series wears the brand tint with the highlighted bar in full accent, on
 * faint quarter gridlines so a figure can be judged without reading every
 * caption. Hovering a column deepens its bar and inks its caption.
 */
export function BarChart({ bars, peak }: { bars: Bar[]; peak: number }) {
  return (
    <>
      <div className="relative mt-4.5 flex h-47.5 items-end gap-1.5 border-b border-divider-strong">
        {/* Quarter lines, behind the bars. */}
        {[25, 50, 75].map((line) => (
          <div
            key={line}
            aria-hidden
            style={{ bottom: `${(line / 100) * 150}px` }}
            className="pointer-events-none absolute inset-x-0 h-px bg-divider"
          />
        ))}
        {bars.map((bar, index) => (
          <div
            key={bar.label}
            className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5"
          >
            <div className="text-center text-2xs tabular-nums text-neutral-600 transition-colors duration-150 group-hover:font-semibold group-hover:text-foreground">
              {bar.display}
            </div>
            <div
              style={{
                height: `${Math.round((bar.value / peak) * 150)}px`,
                animationDelay: `${index * 60}ms`,
              }}
              className={cn(
                'mx-auto w-full max-w-16 origin-bottom animate-ems-grow rounded-t-md transition-colors duration-200',
                bar.highlight
                  ? 'bg-gradient-to-t from-brand-700 to-brand-500 group-hover:from-brand-800 group-hover:to-brand-600'
                  : 'bg-gradient-to-t from-brand-400 to-brand-300 group-hover:from-brand-600 group-hover:to-brand-400',
              )}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {bars.map((bar) => (
          <div
            key={bar.label}
            className="flex-1 truncate text-center text-2xs uppercase tracking-[0.04em] text-neutral-600"
          >
            {bar.label}
          </div>
        ))}
      </div>
    </>
  )
}
