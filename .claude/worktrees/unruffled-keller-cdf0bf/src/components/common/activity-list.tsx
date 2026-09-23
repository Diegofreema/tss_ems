import { cn } from '@/lib/utils'

export type ActivityEntry = {
  id: string
  text: string
  who: string
  when: string
  /** Accent mark for entries that need attention. */
  flagged?: boolean
}

/** The audit-log style list used on dashboards and detail pages. */
export function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div className="mt-3.5 border-t-2 border-divider">
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          style={{ animationDelay: `${index * 34}ms` }}
          className="flex animate-ems-row gap-3 border-b border-divider px-1 py-2.75"
        >
          <div
            className={cn(
              'w-1 flex-none',
              entry.flagged ? 'bg-brand' : 'bg-neutral-300',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm">{entry.text}</div>
            <div className="mt-0.5 text-2xs text-muted-foreground">
              {entry.who} · {entry.when}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
