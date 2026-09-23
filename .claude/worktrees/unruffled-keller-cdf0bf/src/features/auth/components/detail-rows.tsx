import { cn } from '@/lib/utils'

/** Label/value rows under a 2px top rule — used by the outcome screens. */
export function DetailRows({
  rows,
  className,
}: {
  rows: { label: string; value: string }[]
  className?: string
}) {
  return (
    <div className={cn('mt-[18px] border-t-2 border-divider', className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex gap-4 border-b border-divider px-0.5 py-3"
        >
          <div className="w-2/5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {row.label}
          </div>
          <div className="flex-1 text-sm tabular-nums">{row.value}</div>
        </div>
      ))}
    </div>
  )
}
