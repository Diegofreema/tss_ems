import { Table2 } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * The "no records at all" state — distinct from an empty search result.
 *
 * Flat, because it is always inside a card already: the register's, the
 * dashboard panel's. A bordered box inside a bordered box is a box nobody
 * drew on purpose.
 */
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
    <div className="animate-ems-up px-6 py-14 text-center">
      <div className="mx-auto grid size-11 place-items-center rounded-xl bg-ui-line text-neutral-600">
        <Table2 className="size-5" strokeWidth={1.8} />
      </div>
      <div className="mt-4.5 font-heading text-xl font-extrabold">
        {title}
      </div>
      <p className="mx-auto mt-2 max-w-[46ch] text-[15px] text-muted-foreground">
        {body}
      </p>
      {action && <div className="mt-4.5">{action}</div>}
    </div>
  )
}
