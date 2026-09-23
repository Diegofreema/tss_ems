import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { useMyNotices, useNotices, useUnreadNoticeCount } from '@/api/notifications/hooks'
import { noticeKeys } from '@/api/notifications/keys'
import type { Notice } from '@/api/notifications/types'
import { errorMessage } from '@/lib/errors'
import { noticeFeed } from './notice-feed'
import type { Notification } from './types'

/** How many notices the board is asked for at once. */
const BOARD = 25

/**
 * Keeping the board fresh for the price of one integer.
 *
 * `/notifications/unread-count` is polled rather than the list, because a
 * notice posted while somebody has the tab open is the one worth arriving on
 * its own and the count is a fraction of the size. When the number moves —
 * either way; a notice can be deleted as well as posted — the list is
 * refetched, and only then.
 *
 * The first answer is remembered rather than acted on: it is not a change, it
 * is the number arriving for the first time.
 */
function useBoardWatch() {
  const queryClient = useQueryClient()
  const unread = useUnreadNoticeCount()
  const seen = useRef<number>(undefined)

  useEffect(() => {
    const count = unread.data
    if (count === undefined) return
    if (seen.current !== undefined && seen.current !== count) {
      // The whole root, not just `mine`: a reader's own list and the
      // office's board are two views of one thing, and a notice posted while
      // the tab is open changes either.
      void queryClient.invalidateQueries({ queryKey: noticeKeys.all })
    }
    seen.current = count
  }, [unread.data, queryClient])
}

/**
 * The office's own notices, as feed items — the half of every portal's bell
 * that somebody actually wrote.
 *
 * Read rather than loaded: a loader that awaited this would take the whole
 * shell down on a board that is unreachable. A failure here costs the board
 * and nothing else, so the derived half of the feed still draws and `error` is
 * handed back for the page to say so out loud rather than showing "you are up
 * to date", which would be a claim.
 */
export type NoticeFeed = {
  notices: Notification[]
  /** Why the board is missing, in words, or null where it is not. */
  error: string | null
}

/** One list, whichever endpoint it came off, as feed items. */
function useFeedOf(notices: Notice[] | undefined, error: unknown): NoticeFeed {
  return useMemo(
    () => ({
      notices: noticeFeed(notices ?? [], new Date()),
      error: error
        ? errorMessage(error, 'The notice board could not be reached.')
        : null,
    }),
    [notices, error],
  )
}

export function useNoticeFeed(): NoticeFeed {
  const board = useMyNotices({ limit: BOARD })
  useBoardWatch()
  return useFeedOf(board.data, board.error)
}

/**
 * The same feed for the office, off its own list rather than `mine`.
 *
 * An administrator's `/notifications/mine` comes back empty — with
 * `audience: "all"`, and with notices on the board that are addressed to
 * `all` — so a bell built on it shows the office nothing it has posted.
 * `GET /notifications` is the list the office can actually read, and is what
 * `/admin/notices` manages the board from.
 */
export function useOfficeNoticeFeed(): NoticeFeed {
  const board = useNotices({ limit: BOARD })
  useBoardWatch()
  return useFeedOf(board.data?.notifications, board.error)
}

/*
 * What every portal's bell reads. Two hooks and not four, because the feed is
 * the notice board and nothing else now: a reader gets their own list, and
 * the office gets the board it posts to.
 */

export function useMyNotifications(): Notification[] {
  return useNoticeFeed().notices
}

export function useOfficeNotifications(): Notification[] {
  return useOfficeNoticeFeed().notices
}
