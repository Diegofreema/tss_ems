import type { ReactNode } from 'react'

/** A titled block of fields; fields sit on an auto-fit 240px grid. */
export function FormSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-8">
      <h3 className="mb-4 font-heading text-xl font-extrabold tracking-[-0.01em]">
        {title}
      </h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-3.5 gap-y-5">
        {children}
      </div>
    </section>
  )
}
