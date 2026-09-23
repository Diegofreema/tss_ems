import { BLANK } from '@/features/collections/blank'

/**
 * A link out of the portal — a meeting room, a document the school hosts
 * elsewhere. The row around it usually opens the record, so the click is
 * stopped here: following the link and opening the record are different things
 * to want.
 */
export function ExternalLink({ href }: { href: string }) {
  if (!href || href === BLANK) {
    return <span className="text-muted-foreground">{BLANK}</span>
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="break-all text-brand underline-offset-2 hover:underline"
    >
      {href}
    </a>
  )
}
