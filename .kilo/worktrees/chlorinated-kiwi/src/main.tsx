import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { bootstrapDb } from '@/db/bootstrap'
import { startDrain } from '@/db/drain'
import { followSignOut } from '@/db/tabs'
import '@/db/handlers'
import { UpdatePrompt } from '@/features/sync/components/update-prompt'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import './index.css'

/**
 * The device's database is opened before anything renders.
 *
 * Not a preference: every collection is a module constant built at import, and
 * a route loader can ask one for rows before the first paint, so the store has
 * to exist by then. `bootstrapDb` never rejects and gives up after a moment,
 * so the worst case is an app that runs from the network exactly as it does
 * today — never a white screen.
 */
await bootstrapDb()

// Anything left unsent from a previous visit is read back off the disk and
// put in line. Awaited, so no screen can queue a write against a queue that
// has not finished loading — see `storeReady`. The handlers above are imported
// first: the drain starts here, and an op whose handler is not registered yet
// is an op this build claims not to understand.
await startDrain()

// A sign-out in one tab is a sign-out on this machine. Registered before the
// app mounts, so a tab still loading when another signs out follows it too.
followSignOut()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* NuqsAdapter lives in the root route — it reads TanStack Router context. */}
      <RouterProvider router={router} />
      <UpdatePrompt />
    </QueryClientProvider>
  </StrictMode>,
)
