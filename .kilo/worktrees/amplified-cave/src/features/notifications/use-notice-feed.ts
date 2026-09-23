import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { useUnreadNoticeCount } from '@/api/notifications/hooks'
import { noticeKeys } from '@/api/notifications/keys'
import type { Notice } from '@/api/notifications/types'
import { collectionById, collectionError, refetchCollection } from '@/db/collection'
import { myNotices } from '@/db/collections/my-notices'
import { refBoard } from '@/db/collections/reference'
import { SET } from '@/db/ids'
import { useHeld, useHeldDocument } from '@/db/live'
import { errorMessage } from '@/lib/errors'
import { noticeFeed } from './notice-feed'
import type { Notification } from './types'

/** How many notices the bell shows at once. */
const BOARD = 25

/** Asks the school for a board set again, if this device is holding it at all. */
function refreshBoard(id: string): void {
  // An idle set is one nobody has opened; refetching it would sync a portal's
  // board on the strength of a badge poll alone.
  if (collectionById(id)?.status !== 'idle') void refetchCollection(id)
}

/**
 * Keeping the board fresh for the price of one integer.
 *
 * `/notifications/unread-count` is polled rather than the list, because a
 * notice posted while somebody has the tab open is the one worth arriving on
 * its own and the count is a fraction of the size. When the number moves —
 * either way; a notice can be deleted as well as posted — the lists are
 * refetched, and only then.
 *
 * The lists are the device's own sets now, so an invalidation alone does not
 * reach them — the two board collections are asked again alongside it.
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
      // The whole root as well as the sets: the read markers and the office's
      // register tiles still live under the query keys.
      void queryClient.invalidateQueries({ queryKey: noticeKeys.all })
      refreshBoard(SET.myNotices)
      refreshBoard(SET.refBoard)
    }
    seen.current = count
  }, [unread.data, queryClient])
}

/**
 * The office's own notices, as feed items — the half of every portal's bell
 * that somebody actually wrote.
 *
 * Off the device's own set, so the bell still has the board with no
 * connection. A set that has genuinely never synced on this device is the one
 * failure left, and `error` says so out loud rather than showing "you are up
 * to date", which would be a claim.
 */
export type NoticeFeed = {
  notices: Notification[]
  /** Why the board is missing, in words, or null where it is not. */
  error: string | null
}

/** One board set, however it is held, as feed items. */
function useFeedOf(rows: Notice[], failed: boolean, id: string): NoticeFeed {
  return useMemo(
    () => ({
      // `noticeFeed` sorts newest first itself, which matters here: a
      // collection hands its rows back in key order whatever order the
      // school sent them in.
      notices: noticeFeed(rows, new Date()).slice(0, BOARD),
      error: failed
        ? errorMessage(collectionError(id), 'The notice board could not be reached.')
        : null,
    }),
    [rows, failed, id],
  )
}

export function useNoticeFeed(): NoticeFeed {
  const board = useHeld(myNotices)
  useBoardWatch()
  return useFeedOf(board.rows, board.failed, SET.myNotices)
}

/**
 * The same feed for the office, off the board itself rather than `mine`.
 *
 * An administrator's `/notifications/mine` comes back empty — with
 * `audience: "all"`, and with notices on the board that are addressed to
 * `all` — so a bell built on it shows the office nothing it has posted.
 * `refBoard` is the board the office actually reads, and the same document
 * `/admin/notices` manages it from.
 */
export function useOfficeNoticeFeed(): NoticeFeed {
  const board = useHeldDocument(refBoard)
  useBoardWatch()
  return useFeedOf(board.doc?.notifications ?? EMPTY_BOARD, board.failed, SET.refBoard)
}

/** One value, so a board still syncing does not re-memo the feed per render. */
const EMPTY_BOARD: Notice[] = []

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
