import { cn } from '@/lib/utils'

export type Rate = {
  label: string
  /** 0–100. */
  percent: number
  /** Right-hand figure, e.g. "₦24.9m". */
  amount: string
}

/**
 * Labelled horizontal bars. Anything below `weakBelow` renders in accent so a
 * poor rate is visible without reading the number.
 */
export function RateBars({
  rates,
  weakBelow = 65,
}: {
  rates: Rate[]
  weakBelow?: number
}) {
  return (
    <div className="mt-4 border-t border-divider-strong">
      {rates.map((rate, index) => (
        <div
          key={rate.label}
          style={{ animationDelay: `${index * 70}ms` }}
          className="animate-ems-row border-b border-divider px-0.5 py-3.25"
        >
          <div className="flex items-baseline gap-3">
            <div className="flex-1 text-sm font-semibold">{rate.label}</div>
            <div className="text-xs tabular-nums text-muted-foreground">
              {rate.amount}
            </div>
            <div className="w-11.5 text-right font-heading text-sm font-extrabold tabular-nums">
              {rate.percent}%
            </div>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
            <div
              style={{
                width: `${rate.percent}%`,
                animationDelay: `${index * 70}ms`,
              }}
              className={cn(
                'h-full origin-left animate-ems-bar rounded-full',
                rate.percent < weakBelow
                  ? 'bg-gradient-to-r from-danger to-danger/75'
                  : 'bg-gradient-to-r from-brand-600 to-brand-400',
              )}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
