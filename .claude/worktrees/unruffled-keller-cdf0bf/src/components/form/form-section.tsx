import type { ReactNode } from 'react'
import { SectionHeading } from '@/components/common/section-heading'

/** A titled block of fields; fields sit on an auto-fit 240px grid. */
export function FormSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-7.5">
      <SectionHeading className="mb-4">{title}</SectionHeading>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4.5">
        {children}
      </div>
    </section>
  )
}
