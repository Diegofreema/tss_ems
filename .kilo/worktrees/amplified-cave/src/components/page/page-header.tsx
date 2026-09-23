import type { ReactNode } from 'react'

/**
 * The page's own title block.
 *
 * The kicker is what is left of the breadcrumb the header used to carry: the
 * header is the search box's now, so the one line saying which part of the
 * school this page belongs to lives here, over the title.
 */
export function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[70ch]">
        {kicker && (
          <div className="text-2xs uppercase tracking-kicker text-muted-foreground">
            {kicker}
          </div>
        )}
        <h2 className="mt-1.5 font-heading text-2xl font-extrabold tracking-[-0.02em]">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-[15px] text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
