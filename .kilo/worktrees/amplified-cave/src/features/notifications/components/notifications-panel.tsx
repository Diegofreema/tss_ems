import { Link } from '@tanstack/react-router'
import { Panel } from '@/components/page/panel'
import { NotificationRow } from './notification-row'
import type { Notification } from '../types'

/** How many of the newest notices a dashboard panel shows. */
const PEEK = 4

/**
 * The notice board on a portal's own front page, beside whatever that portal's
 * main panel is.
 *
 * The same rows the bell drops down, in the place somebody looks when they
 * have just opened the app rather than when they have noticed a badge. Read
 * off the device's own copy of the board, so it says the same thing with no
 * connection.
 */
export function NotificationsPanel({
  notifications,
  allPath,
}: {
  notifications: Notification[]
  allPath: string
}) {
  const newest = notifications.slice(0, PEEK)

  return (
    <Panel
      title="Notifications"
      action={
        notifications.length > 0 ? (
          <Link to={allPath} className="text-sm text-brand hover:underline">
            See all
          </Link>
        ) : undefined
      }
      bodyClassName="-mx-5 -mb-5"
    >
      {newest.length === 0 ? (
        <div className="px-5 py-14 text-center text-sm text-muted-foreground">
          Nothing yet. Notices the school posts arrive here.
        </div>
      ) : (
        <div className="border-t border-divider">
          {newest.map((notification, index) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              index={index}
              compact
            />
          ))}
        </div>
      )}
    </Panel>
  )
}
