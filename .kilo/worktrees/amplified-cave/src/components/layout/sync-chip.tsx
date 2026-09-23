import { WifiOff } from 'lucide-react'
import { openPendingWork } from '@/db/drain'
import { useSyncStatus } from '@/db/status'
import { syncSurface } from '@/features/sync/message'

/**
 * The slim chip in the header for the state worth acknowledging but not
 * announcing: offline, on a device that keeps everything.
 *
 * Offline is a normal working state for this app, not an incident, and the
 * full-width bar that used to sit under the header all day said otherwise.
 * The chip says the app knows, carries the count of work saved here, and
 * opens the pending-work drawer for anybody who wants to see it. The moments
 * that genuinely need a person — a refused write, a browser that cannot
 * store work, a stuck queue — are still the bar's (`OfflineBanner`), decided
 * in the same place: `syncSurface`.
 */
export function SyncChip() {
  const { online, durable, waiting, failed, review, stuck } = useSyncStatus()
  const surface = syncSurface({
    online,
    durable,
    waiting,
    needsAnswer: failed + review,
    stuck,
  })

  if (surface.kind !== 'chip') return null

  return (
    <button
      type="button"
      onClick={openPendingWork}
      className="flex flex-none cursor-pointer items-center gap-1.5 rounded-full border border-divider-strong px-2.5 py-1.5 text-2xs font-medium whitespace-nowrap text-muted-foreground"
    >
      <WifiOff className="size-3.25 flex-none" strokeWidth={2.1} />
      {surface.label}
    </button>
  )
}
