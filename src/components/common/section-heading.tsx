import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** An accent `h6` followed by a 1px rule — the design's section divider. */
export function SectionHeading({
  children,
  action,
  className,
}: {
  children: ReactNode
  /** Sits after the rule, e.g. the picker's "Select all". */
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline gap-2.5', className)}>
      <h6 className="text-sm uppercase tracking-label text-brand-700">
        {children}
      </h6>
      <div className="h-px flex-1 bg-divider" />
      {action}
    </div>
  )
}
