import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type QueueItem = {
  id: string
  title: string
  detail: string
  cta: string
  to:
    | '/parent/pay'
    | '/parent/invoices'
    | '/parent/assignments'
    | '/parent/attendance'
    | '/parent/results'
  /** Accent mark for anything that needs the parent now. */
  urgent?: boolean
}

/** "What needs you", sorted by how soon it matters. */
export function ActionQueue({
  items,
  empty = 'Nothing needs you right now.',
}: {
  items: QueueItem[]
  /** Said in place of the list — an empty queue is good news, not a fault. */
  empty?: string
}) {
  if (!items.length) {
    return (
      <div className="mt-3.5 border-t-2 border-divider px-1 py-[13px] text-sm text-muted-foreground">
        {empty}
      </div>
    )
  }

  return (
    <div className="mt-3.5 border-t-2 border-divider">
      {items.map((item, index) => (
        <div
          key={item.id}
          style={{ animationDelay: `${index * 50}ms` }}
          className="flex animate-ems-row items-baseline gap-3.5 border-b border-divider px-1 py-[13px]"
        >
          <div
            className={cn(
              'w-1 flex-none self-stretch',
              item.urgent ? 'bg-brand' : 'bg-neutral-400',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{item.title}</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">
              {item.detail}
            </div>
          </div>
          <Button asChild variant="ghost" className="text-brand">
            <Link to={item.to}>{item.cta}</Link>
          </Button>
        </div>
      ))}
    </div>
  )
}
