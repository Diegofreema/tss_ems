import { AlertTriangle, Clock, RotateCw, Trash2 } from 'lucide-react'
import { discard, retry } from '@/db/drain'
import type { OutboxOp } from '@/db/outbox'
import { useSyncStatus } from '@/db/status'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** What each state is, said to the person rather than to the queue. */
function describe(op: OutboxOp): { line: string; tone: 'waiting' | 'attention' } {
  switch (op.state) {
    case 'queued':
    case 'sending':
      // A waiting op that has already been refused once carries the reason,
      // and saying only "Waiting to send" left the one screen that could
      // explain the wait explaining nothing — a person looking at a message
      // that would not go had no way to find out why not.
      return {
        line: op.lastError ? `Waiting to try again — ${op.lastError}` : 'Waiting to send',
        tone: 'waiting',
      }
    case 'needs-review':
      return {
        line: op.lastError ?? 'This may already have been saved. Check before sending it again.',
        tone: 'attention',
      }
    case 'conflict':
      return { line: 'Somebody else changed this while it waited.', tone: 'attention' }
    case 'failed':
      return { line: op.lastError ?? 'The school refused this.', tone: 'attention' }
  }
}

/**
 * Everything this device is holding that the school has not taken.
 *
 * Not a nicety. A queue nobody can see is a queue nobody can trust, and the
 * whole promise of this app is that a register marked in a classroom is safe —
 * which is only believable if the person can look at it and see it sitting
 * there.
 */
export function PendingWork({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { ops, durable } = useSyncStatus()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Work saved on this device</DialogTitle>
          <DialogDescription>
            {durable
              ? 'These are kept here until the school takes them, and survive closing the browser.'
              : 'This browser cannot save work between visits — keep this tab open until these have sent.'}
          </DialogDescription>
        </DialogHeader>

        {ops.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Everything has been sent.
          </p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {ops.map((op) => {
              const { line, tone } = describe(op)
              const needsAnswer = op.state !== 'queued' && op.state !== 'sending'

              return (
                <li
                  key={op.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  {tone === 'waiting' ? (
                    <Clock className="mt-0.5 size-4 flex-none text-muted-foreground" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 flex-none text-destructive" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{op.label}</p>
                    <p className="text-xs text-muted-foreground">{line}</p>
                  </div>

                  {needsAnswer && (
                    <div className="flex flex-none gap-1">
                      <Button size="icon-xs" variant="ghost" onClick={() => retry(op.id)}>
                        <RotateCw />
                        <span className="sr-only">Send {op.label} again</span>
                      </Button>
                      <Button size="icon-xs" variant="ghost" onClick={() => discard(op.id)}>
                        <Trash2 />
                        <span className="sr-only">Discard {op.label}</span>
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
