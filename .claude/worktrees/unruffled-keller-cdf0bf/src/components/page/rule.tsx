import { cn } from '@/lib/utils'

/** The design system's `.hr` — a 2px divider, never a hairline. */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn('my-4 h-0.5 border-0 bg-divider', className)} />
}
