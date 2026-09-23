import { useLiveQuery } from '@tanstack/react-db'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { queueStuck } from '@/features/sync/message'
import type { OutboxOp } from './outbox'
import { isPausedForAuth } from './drain'
import { runtime } from './runtime'
import { outbox } from './store'

export type SyncStatus = {
  online: boolean
  /** Whether work written now survives a reload. */
  durable: boolean
  /** Written down, not yet sent. */
  waiting: number
  /** The school refused these, or something they needed failed. */
  failed: number
  /** In flight when the tab died, and not safe to send again unasked. */
  review: number
  /** Waiting on something the queue cannot fix alone — a backoff after a
   *  failure, or the auth pause. What "Send now" exists to override. */
  stuck: boolean
  /** Everything the reader could be shown in the drawer, newest last. */
  ops: OutboxOp[]
}

/**
 * What the header chip, the offline banner and the pending-work drawer all
 * read.
 *
 * A live query rather than a poll: the counts move the moment the queue does,
 * which is the difference between a reader trusting the number and checking it.
 * `isPausedForAuth` is module state, not reactive — read here on the strength
 * of the pause always co-arriving with an outbox update (the 401 writes the
 * refusal onto the head op), which is what re-renders this hook.
 */
export function useSyncStatus(): SyncStatus {
  const online = useOnlineStatus()
  const { data } = useLiveQuery({ query: (q) => q.from({ op: outbox() }) })

  const ops = (data ?? []) as OutboxOp[]

  return {
    online,
    durable: runtime.durable,
    waiting: ops.filter((op) => op.state === 'queued' || op.state === 'sending').length,
    failed: ops.filter((op) => op.state === 'failed' || op.state === 'conflict').length,
    review: ops.filter((op) => op.state === 'needs-review').length,
    stuck: queueStuck(ops, isPausedForAuth()),
    ops: [...ops].sort((a, b) => a.seq - b.seq),
  }
}
