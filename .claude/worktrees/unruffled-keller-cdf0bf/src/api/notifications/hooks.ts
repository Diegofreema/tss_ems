import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { noticeKeys } from './keys'
import { noticesService } from './service'
import type { MyNoticeParams, NoticeBody, NoticeEditBody, NoticeListParams } from './types'

/** Reading and writing the school's notice board. */

/** Notices addressed to the signed-in caller. */
export function useMyNotices(params: MyNoticeParams = {}) {
  return useQuery({
    queryKey: noticeKeys.mine(params),
    queryFn: () => noticesService.mine(params),
    // Nothing waits on this — the feed draws its other half regardless — and
    // a board that is down is down for the whole visit, not for one attempt.
    retry: false,
  })
}

/**
 * The badge number on its own.
 *
 * Polled rather than invalidated, because a notice the office posts while the
 * tab is open is the one worth arriving without a reload — and this is the
 * cheap way to find out. It is one integer against the twenty-five rows of
 * `mine`, so the list is only refetched once this says the number moved.
 */
export function useUnreadNoticeCount() {
  return useQuery({
    queryKey: noticeKeys.unread(),
    queryFn: () => noticesService.unreadCount(),
    retry: false,
    // Polling an endpoint that has already failed is noise in the network tab;
    // it starts again on the next mount.
    refetchInterval: (query) => (query.state.error ? false : 60_000),
  })
}

/**
 * Opens one notice — a read that writes, since fetching it is what marks it
 * read and counts the view. A mutation rather than a query for that reason: a
 * route loader or a cache refetch would clear somebody's badge, and every
 * refetch would count another view on top.
 *
 * Silent. The reader asked for the notice and is looking at it; a toast saying
 * so is noise on top of an answer they can already see.
 */
export function useOpenNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => noticesService.open(id),
    onSuccess: (answer) => {
      queryClient.setQueryData(noticeKeys.detail(String(answer.notification.id)), answer.notification)
      // The badge number comes back beside the notice, so it moves without a
      // second call; the lists still refetch, since `is_read` has changed.
      queryClient.setQueryData(noticeKeys.unread(), answer.unread_count)
      void queryClient.invalidateQueries({ queryKey: noticeKeys.everyMine() })
    },
  })
}

/**
 * Marks everything addressed to the caller as read, in one call.
 *
 * `read-all` and not a run of `open`s: opening a notice counts a view as well
 * as marking it read, so clearing a board that way would add a hit to every
 * notice on it and quietly inflate the figure the office reads.
 */
export function useMarkAllNoticesRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => noticesService.readAll(),
    meta: { success: 'All notices marked read' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noticeKeys.all }),
  })
}

/** Every notice the office holds, whoever it was addressed to. The office only. */
export function useNotices(params: NoticeListParams = {}) {
  return useQuery({
    queryKey: noticeKeys.list(params),
    queryFn: () => noticesService.all(params),
  })
}

export function usePostNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: NoticeBody) => noticesService.post(body),
    meta: { success: 'Notice posted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noticeKeys.all }),
  })
}

export function useEditNotice(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: NoticeEditBody) => noticesService.edit(id, body),
    meta: { success: 'Notice updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noticeKeys.all }),
  })
}

/** Takes the read-marks with it, so the badge moves for everyone. */
export function useDeleteNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => noticesService.remove(id),
    meta: { success: 'Notice deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noticeKeys.all }),
  })
}
