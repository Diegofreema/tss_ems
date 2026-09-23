import { Link } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMarkAllNoticesRead, useUnreadNoticeCount } from '@/api/notifications/hooks'
import { Button } from '@/components/ui/button'
import { headerControl } from '@/components/layout/header/controls'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useNotificationsStore } from '../notifications.store'
import type { Notification } from '../types'
import { NotificationRow } from './notification-row'

const PEEK_COUNT = 4

/**
 * Header bell with an unread badge, and a 380px panel anchored under it on a
 * screen wide enough to hang one.
 *
 * The badge is the server's own number, off `/notifications/unread-count` —
 * the endpoint made for it, polled by its hook — rather than a count of the
 * few rows the panel holds, which top out at the page size and go stale the
 * moment another device reads something.
 *
 * **On a phone the bell is a door, not a menu.** A 380px panel pinned to the
 * right of a 375px viewport is the whole screen with a corner cut off it, and
 * what it holds is four rows and a button to the page that holds them all —
 * so it asks somebody to read a cramped copy of a page before offering them
 * the page. Narrow, the bell navigates straight there, which is also what the
 * hand expects: on a phone a bell in a bar is a tab, not a dropdown.
 */
export function NotificationBell({
  notifications,
  allPath,
}: {
  notifications: Notification[]
  allPath: string
}) {
  const [open, setOpen] = useState(false)
  const narrow = useBreakpoint('narrow')
  const unread = useUnreadNoticeCount().data ?? 0
  const markAllRead = useNotificationsStore((state) => state.markAllRead)
  const markBoardRead = useMarkAllNoticesRead()

  /**
   * One call to `read-all`, and the browser's own marks alongside it so the
   * rows dim before the refetch confirms — the same pair the notifications
   * page fires, so the two buttons cannot disagree about what "all" means.
   */
  const clearAll = () => {
    markAllRead(notifications.map((item) => item.id))
    markBoardRead.mutate()
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  /* The same glyph and the same badge whichever the bell turns out to be. */
  const face = (
    <>
      <Bell className="size-4" strokeWidth={1.9} />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid h-4.25 min-w-4.25 place-items-center rounded-full bg-brand px-1 font-heading text-2xs font-extrabold tabular-nums text-white">
          {unread}
        </span>
      )}
    </>
  )

  if (narrow)
    return (
      <Button
        asChild
        variant="outline"
        size="icon"
        title="Notifications"
        aria-label="Notifications"
        className={headerControl}
      >
        <Link to={allPath}>{face}</Link>
      </Button>
    )

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen((previous) => !previous)}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        className={headerControl}
      >
        {face}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-45"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute top-[calc(100%+10px)] right-0 z-50 max-h-[70vh] w-[min(380px,88vw)] animate-ems-pop overflow-y-auto rounded-lg bg-raised shadow-float ring-1 ring-foreground/10">
            <div className="flex items-center gap-2.5 border-b border-divider px-4 py-3.5">
              <div className="flex-1 font-heading text-base font-extrabold">
                Notifications
              </div>
              <Button
                variant="ghost"
                className="px-1.5 py-0.5 text-xs text-brand"
                pending={markBoardRead.isPending}
                onClick={clearAll}
              >
                Mark all read
              </Button>
            </div>

            {notifications.slice(0, PEEK_COUNT).map((notification, index) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                index={index}
                compact
                onOpen={() => setOpen(false)}
              />
            ))}

            <div className="px-4 py-3">
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpen(false)}
              >
                <Link to={allPath}>See all notifications</Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
