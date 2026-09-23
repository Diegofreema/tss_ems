import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { noticeKeys } from './keys'
import { noticesService } from './service'
import type { NoticeBody, NoticeEditBody } from './types'

/** Reading and writing the school's notice board. */

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
 * Marks one notice read from the list, via `/read` rather than by opening it —
 * so the view count is left alone. Silent: the reader ticked a row off, they
 * do not need to be told they did.
 *
 * The badge number comes back with the answer, so it moves without a second
 * call; the lists still refetch, since `is_read` has changed for this reader.
 */
export function useMarkNoticeRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => noticesService.readOne(id),
    onSuccess: (answer) => {
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
    onSuccess: () => {
      // The badge answers for itself: everything is read now, so it is zero —
      // written straight away rather than left to the poll, then confirmed by
      // the refetch the invalidation triggers.
      queryClient.setQueryData(noticeKeys.unread(), 0)
      return queryClient.invalidateQueries({ queryKey: noticeKeys.all })
    },
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
