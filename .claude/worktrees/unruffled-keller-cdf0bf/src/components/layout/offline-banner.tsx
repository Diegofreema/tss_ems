import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/use-online-status'

/** Full-width accent bar directly under the header while the browser is offline. */
export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div className="flex animate-ems-up items-center gap-3.5 bg-brand px-content py-2.75 text-white">
      <WifiOff className="size-4.25 flex-none" strokeWidth={2.1} />
      <div className="flex-1 text-sm">
        You are offline. Nothing you type is being saved to the school server — it
        will send when the connection returns.
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="cursor-pointer rounded-md border border-white bg-white px-3.5 py-2 font-heading text-sm font-extrabold text-neutral-900"
      >
        Try now
      </button>
    </div>
  )
}
