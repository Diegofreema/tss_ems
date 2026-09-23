import type { ReactNode } from 'react'
import { useOpenNotice } from '@/api/notifications/hooks'
import { Tag } from '@/components/common/tag'
import { cn } from '@/lib/utils'
import { useNotificationsStore } from '../notifications.store'
import type { Notification } from '../types'

/**
 * One item. Unread rows carry a 6% accent wash, a filled square and a bolder
 * title.
 *
 * A notice leads nowhere — it is the content, not a pointer at a page — so
 * the row is a button rather than a link, and clicking it does the one thing
 * there is to do: mark it read, here and at the server.
 */
export function NotificationRow({
  notification,
  index,
  compact,
  onOpen,
}: {
  notification: Notification
  index: number
  /** The header panel uses the tighter variant. */
  compact?: boolean
  onOpen?: () => void
}) {
  const stored = useNotificationsStore((state) => state.read[notification.id])
  const markRead = useNotificationsStore((state) => state.markRead)
  const openNotice = useOpenNotice()
  const read = notification.read || stored

  const open = () => {
    markRead(notification.id)
    // Opening a notice is also what counts the view, so it is asked for
    // once and only for one the reader has not already opened.
    if (notification.noticeId !== undefined && !read) {
      openNotice.mutate(notification.noticeId)
    }
    onOpen?.()
  }

  const className = cn(
    'flex w-full animate-ems-row gap-3.5 border-b border-divider text-left !text-foreground transition-[background-color,padding-left] duration-150 hover:bg-neutral-100',
    compact ? 'px-4 py-3.5' : 'px-2 py-4 hover:pl-3.5',
    !read && 'bg-brand/6',
  )
  const style = { animationDelay: `${index * 34}ms` }
  const body: ReactNode = <RowBody notification={notification} read={!!read} compact={compact} />

  return (
    <button type="button" onClick={open} style={style} className={className}>
      {body}
    </button>
  )
}

function RowBody({
  notification,
  read,
  compact,
}: {
  notification: Notification
  read: boolean
  compact?: boolean
}) {
  return (
    <>
      <div className={cn('mt-[7px] size-2 flex-none', read ? 'bg-neutral-300' : 'bg-brand')} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <div
            className={cn(
              compact ? 'text-[13.5px]' : 'text-[15px]',
              read ? 'font-normal' : 'font-bold',
            )}
          >
            {notification.title}
          </div>
          {!compact && (
            <Tag variant="neutral" className="px-1.5 py-px text-[10px]">
              {notification.kicker}
            </Tag>
          )}
        </div>
        <div className="mt-1 text-[13px] leading-normal text-muted-foreground">
          {notification.body}
        </div>
        {/* The panel has no room for a column of times, so the stamp joins the
            meta line there; the page keeps it out on the right. */}
        {(compact || notification.meta) && (
          <div
            className={cn(
              'mt-1.5 text-[11px] uppercase tracking-[0.06em] text-muted-foreground',
              compact && 'truncate',
            )}
          >
            {[notification.meta, compact ? notification.when : null]
              .filter(Boolean)
              .join(' \u00b7 ')}
          </div>
        )}
      </div>
      {!compact && (
        <div className="flex-none text-[11.5px] tabular-nums text-muted-foreground">
          {notification.when}
        </div>
      )}
    </>
  )
}
