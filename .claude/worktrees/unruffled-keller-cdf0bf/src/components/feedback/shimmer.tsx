import { cn } from '@/lib/utils'

/** A single shimmering bar — the building block of every loading skeleton. */
export function Shimmer({
  className,
  delay = 0,
  style,
}: {
  className?: string
  delay?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms`, ...style }}
      className={cn(
        'animate-ems-shimmer bg-neutral-200 bg-[linear-gradient(90deg,var(--ems-neutral-200)_25%,var(--ems-neutral-100)_50%,var(--ems-neutral-200)_75%)] bg-[length:300%_100%]',
        className,
      )}
    />
  )
}
