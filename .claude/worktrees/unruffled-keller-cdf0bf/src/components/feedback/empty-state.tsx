import { Table2 } from 'lucide-react'
import type { ReactNode } from 'react'

/** The "no records at all" state — distinct from an empty search result. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="animate-ems-up rounded-xl border border-divider px-6 py-16 text-center">
      <div className="mx-auto grid size-9.5 place-items-center rounded-lg border border-divider text-neutral-600">
        <Table2 className="size-5" strokeWidth={1.8} />
      </div>
      <div className="mt-4.5 font-heading text-xl font-extrabold">
        {title}
      </div>
      <p className="mx-auto mt-2 max-w-[46ch] text-sm text-muted-foreground">
        {body}
      </p>
      {action && <div className="mt-4.5">{action}</div>}
    </div>
  )
}
