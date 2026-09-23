import { Link } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { headerControl } from '@/components/layout/header/controls'
import { msgInbox } from '@/db/collections/messages'
import { useHeldDocument } from '@/db/live'
import { inboxUnread } from '../inbox'

/**
 * The header's messages button, beside the notification bell.
 *
 * A door rather than a panel: a conversation is read and answered, which is a
 * page, not something to do out of a 380px dropdown. What it adds over a nav
 * item is the count — and the count is the inbox document's own total, read
 * off the device, so it is right with no connection and costs no request of
 * its own. That is what retired `/conversations/unread-count`.
 *
 * Nothing is drawn until the set has answered once, so a portal whose reader
 * has no messages page never shows an empty badge.
 */
export function MessagesButton({ to }: { to: string }) {
  const { doc } = useHeldDocument(msgInbox)
  const unread = inboxUnread(doc)

  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className={headerControl}
      title={unread > 0 ? `Messages — ${unread} unread` : 'Messages'}
    >
      <Link to={to} aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}>
        <MessageSquare className="size-4" strokeWidth={1.9} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid h-4.25 min-w-4.25 place-items-center rounded-full bg-brand px-1 font-heading text-2xs font-extrabold tabular-nums text-white">
            {unread}
          </span>
        )}
      </Link>
    </Button>
  )
}
