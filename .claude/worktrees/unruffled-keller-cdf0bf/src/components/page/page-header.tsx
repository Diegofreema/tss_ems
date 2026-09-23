import type { ReactNode } from 'react'

/** Kicker / title / sub on the left, primary action on the right. */
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
      <div className="max-w-[60ch]">
        <div className="text-2xs uppercase tracking-[0.12em] text-brand-700">
          {kicker}
        </div>
        <h2 className="mt-2 text-page-title">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
