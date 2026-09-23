import { noticesService } from '@/api/notifications/service'
import type { Notice } from '@/api/notifications/types'
import { schoolCollection } from '../collection'
import { SET } from '../ids'

/**
 * The notices addressed to whoever is signed in — the half of every portal's
 * bell that somebody actually wrote.
 *
 * Its own module rather than a member of any one portal's file, because the
 * endpoint is token-scoped and the bell hangs in all of them: a teacher, a
 * student and a guardian each get their own answer under the same id, and the
 * per-account wipe keeps one login's board from ever reaching another. The
 * office is the exception — an administrator's `/notifications/mine` comes
 * back empty, so its bell reads `refBoard`, the board it posts to.
 *
 * Every reader portal's shell preloads this alongside its own sets, so the
 * bell has the board with no connection.
 */

/** More than the bell shows, so "read" state changing page order loses nothing. */
const BOARD_PAGE = 200

export const myNotices = schoolCollection<Notice, number>({
  id: SET.myNotices,
  fetch: () => noticesService.mine({ limit: BOARD_PAGE }),
  getKey: (notice) => notice.id,
  schemaVersion: 1,
})
