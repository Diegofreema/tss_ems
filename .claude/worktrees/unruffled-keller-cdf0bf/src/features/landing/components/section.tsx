import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The page shell: one 1320px column on fluid padding, closed with a 2px rule.
 *
 * Sections alternate between the two grounds the design allows — the page's
 * own and the lighter neutral — and nothing else.
 */
export function Section({
  id,
  lifted,
  className,
  children,
}: {
  id?: string
  /** Draws the section on the lighter of the two grounds. */
  lifted?: boolean
  /** Lands on the inner column, which some sections lay out as a grid. */
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={cn('border-b-2 border-divider', lifted && 'bg-neutral-100')}
    >
      <div
        className={cn(
          'mx-auto max-w-[1320px] px-[clamp(20px,4vw,48px)] py-[clamp(48px,7vw,96px)]',
          className,
        )}
      >
        {children}
      </div>
    </section>
  )
}

/** The numbered line above every heading. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10.5px] font-bold tracking-[.16em] text-brand-700 uppercase">
      {children}
    </div>
  )
}

/** Kicker and h2, the pair every section opens with. */
export function SectionHeading({
  kicker,
  title,
  className,
  children,
}: {
  kicker: string
  title: string
  className?: string
  /** Anything the heading carries under it — a lede, a button. */
  children?: ReactNode
}) {
  return (
    <div className={className}>
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-3.5 font-heading text-[clamp(26px,3.4vw,44px)] leading-[1.02] font-extrabold tracking-[-.025em]">
        {title}
      </h2>
      {children}
    </div>
  )
}

/** The paragraph that follows a heading. */
export function Lede({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <p
      className={cn(
        'text-[clamp(15px,1.4vw,17.5px)] leading-[1.55] text-neutral-800',
        className,
      )}
    >
      {children}
    </p>
  )
}

/**
 * The two card grids.
 *
 * Cards sit on the divider colour with a 2px gap, which is what draws the rules
 * between them. That means a partly-filled last row would paint solid grey, so
 * the track count is fixed at every width rather than left to `auto-fit`: four
 * cards across, two under 1040px, one under 540px — and the two grids that use
 * this hold eight and four.
 */
export const QUAD_GRID =
  'grid gap-[2px] bg-divider grid-cols-4 max-[1040px]:grid-cols-2 max-[540px]:grid-cols-1'

/** The same, for the three testimonials. */
export const TRI_GRID = 'grid gap-[2px] bg-divider grid-cols-3 max-[900px]:grid-cols-1'
