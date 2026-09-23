import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A white card on the page's ground: the unit everything on a page is made of
 * now — a register, a chart, a form section, a list of activity.
 *
 * No border, but a shadow. The ground was meant to be what separates one card
 * from the next, and in daylight it does not: `--ems-ground` and
 * `--ems-raised` are #fafafa and #ffffff, a 2% difference that reads as one
 * flat page rather than a card standing on it. The shadow is what makes it a
 * card, in both themes and on either ground, without the border a page of
 * bordered cards would turn into a page of lines.
 */
export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode
  description?: ReactNode
  /** Sits opposite the title — a date picker, a link, a button. */
  action?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <section className={cn('rounded-xl bg-raised p-5 shadow-card', className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="font-heading text-lg font-extrabold">{title}</h3>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
