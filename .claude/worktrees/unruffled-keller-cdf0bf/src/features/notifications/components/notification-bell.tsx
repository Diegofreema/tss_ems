import { Link } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useNotificationsStore, useUnread } from '../notifications.store'
import type { Notification } from '../types'
import { NotificationRow } from './notification-row'

const PEEK_COUNT = 4

/** Header bell with an unread badge and a 380px panel anchored under it. */
export function NotificationBell({
  notifications,
  allPath,
}: {
  notifications: Notification[]
  allPath: string
}) {
  const [open, setOpen] = useState(false)
  const unread = useUnread(notifications)
  const markAllRead = useNotificationsStore((state) => state.markAllRead)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen((previous) => !previous)}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        className="size-9"
      >
        <Bell className="size-4" strokeWidth={1.9} />
        {unread.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid h-[17px] min-w-[17px] place-items-center bg-brand px-1 font-heading text-[10px] font-extrabold tabular-nums text-white">
            {unread.length}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-45"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute top-[calc(100%+10px)] right-0 z-50 max-h-[70vh] w-[min(380px,88vw)] animate-ems-pop overflow-y-auto border-2 border-foreground bg-background shadow-lg">
            <div className="flex items-center gap-2.5 border-b-2 border-divider px-4 py-3.5">
              <div className="flex-1 font-heading text-[15px] font-extrabold">
                Notifications
              </div>
              <Button
                variant="ghost"
                className="px-1.5 py-0.5 text-xs text-brand"
                onClick={() => markAllRead(notifications.map((item) => item.id))}
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
