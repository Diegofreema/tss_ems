import { AlertTriangle, Clock, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { sendNow, setDrawerOpener } from '@/db/drain'
import { useSyncStatus } from '@/db/status'
import { PendingWork } from '@/features/sync/components/pending-work'
import { syncMessage, syncSurface } from '@/features/sync/message'

/**
 * The bar under the header, for the states that need a person: a refused
 * write, a browser that cannot store work, a queue stuck behind a failure or
 * an expired token. It also owns the pending-work drawer, whichever surface
 * opened it.
 *
 * It used to speak in more weather than this — the whole time the device was
 * offline, and for the second every online save spent in flight. Both taught
 * the wrong lesson: offline is a normal state for this app, said by the chip
 * in the header instead (`SyncChip`), and a healthy queue sending in the
 * background is not an event. Which surface speaks is decided in
 * `syncSurface`, pure and tested.
 */
export function OfflineBanner() {
  const { online, durable, waiting, failed, review, stuck } = useSyncStatus()
  const [showing, setShowing] = useState(false)

  // The drain announces a late failure with a Review action, and the header
  // chip has no room for a dialog of its own; this is what both open.
  useEffect(() => setDrawerOpener(() => setShowing(true)), [])

  const needsAnswer = failed + review
  const surface = syncSurface({ online, durable, waiting, needsAnswer, stuck })

  return (
    <>
      {surface.kind === 'bar' && (
        <div
          className={`flex animate-ems-up items-center gap-3.5 px-content py-2.75 text-white ${
            needsAnswer > 0 ? 'bg-destructive' : 'bg-brand'
          }`}
        >
          {needsAnswer > 0 ? (
            <AlertTriangle className="size-4.25 flex-none" strokeWidth={2.1} />
          ) : online ? (
            // Online with a stuck queue: the connection is not the problem.
            <Clock className="size-4.25 flex-none" strokeWidth={2.1} />
          ) : (
            <WifiOff className="size-4.25 flex-none" strokeWidth={2.1} />
          )}

          <div className="flex-1 text-sm">
            {syncMessage({ online, durable, waiting, needsAnswer })}
          </div>

          {(waiting > 0 || needsAnswer > 0) && (
            <button
              type="button"
              onClick={() => setShowing(true)}
              className="cursor-pointer rounded-md border border-white bg-white px-3.5 py-2 font-heading text-sm font-extrabold text-neutral-900"
            >
              {needsAnswer > 0 ? 'Review' : 'See what'}
            </button>
          )}

          {surface.sendNow && (
            /*
              `sendNow`, not `drain`. A plain drain returns at its own guards —
              the auth pause, and the head of the queue serving out a backoff —
              which are exactly the states this button is shown in, so it used
              to do nothing at all in every one of them.
            */
            <button
              type="button"
              onClick={() => sendNow()}
              className="cursor-pointer rounded-md border border-white px-3.5 py-2 font-heading text-sm font-extrabold text-white"
            >
              Send now
            </button>
          )}
        </div>
      )}

      <PendingWork open={showing} onOpenChange={setShowing} />
    </>
  )
}
