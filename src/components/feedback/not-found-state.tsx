import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

export type NotFoundLink = {
  to: string
  label: string
  hint: string
}

/** The in-portal 404: an accent numeral over the routes people usually want. */
export function NotFoundState({
  links,
  audience,
}: {
  links: NotFoundLink[]
  audience: string
}) {
  return (
    <div className="mx-auto w-full max-w-[620px] py-10">
      <div className="font-heading text-numeral leading-[0.9] font-extrabold tracking-[-0.04em] text-brand">
        404
      </div>
      <h2 className="mt-4.5 text-page-title">There is no page here</h2>
      <p className="mt-2.5 text-sm text-muted-foreground">
        The link may be old, or the record may have been deleted. These are the
        places {audience} usually want:
      </p>

      <div className="mt-5 border-t border-divider-strong">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex w-full items-center gap-3 border-b border-divider px-1 py-3.5 text-left text-sm !text-foreground transition-[background-color,padding-left] duration-150 hover:bg-neutral-100 hover:pl-2.5"
          >
            <span className="flex-1">{link.label}</span>
            <span className="text-xs text-muted-foreground">{link.hint}</span>
            <ChevronRight className="size-3.75" strokeWidth={2} />
          </Link>
        ))}
      </div>
    </div>
  )
}
