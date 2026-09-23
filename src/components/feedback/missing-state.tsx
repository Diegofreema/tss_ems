import { SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { Rule } from '@/components/page/rule'

/**
 * A record that was asked for and did not come back.
 *
 * Distinct from the portal's 404, which says the URL leads nowhere: this says
 * the page is right and the data is not there. It keeps the shell, the
 * breadcrumb and the way back, so the office can leave without the browser's
 * back button.
 */
export function MissingState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-[580px] py-2">
      <div className="grid size-10 place-items-center rounded-lg bg-brand text-white">
        <SearchX className="size-5.25" strokeWidth={2.1} />
      </div>
      <h2 className="mt-5 text-page-title">{title}</h2>
      <p className="mt-2.5 max-w-[60ch] text-sm text-muted-foreground">{body}</p>

      {action && (
        <>
          <Rule />
          <div className="flex flex-wrap gap-2.5">{action}</div>
        </>
      )}
    </div>
  )
}
