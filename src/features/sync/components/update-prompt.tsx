import { useEffect } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

/**
 * Offers a new version rather than taking one.
 *
 * The alternative — a service worker that claims the page and reloads it the
 * moment a build lands — would be fine in an office app and is not fine here.
 * Somebody is halfway through marking thirty students, and their unsaved form
 * state is not in the queue yet. So the new version waits until they say.
 */
export function UpdatePrompt() {
  useEffect(() => {
    const update = registerSW({
      // Registers now rather than on `window.load`, which has already fired:
      // `main.tsx` awaits the local database before it mounts anything, so by
      // the time this effect runs the load event is long gone and a listener
      // for it would never be called. Verified against a production build —
      // without this, no service worker is ever registered at all.
      immediate: true,
      onNeedRefresh: () => {
        toast('A new version of the portal is ready.', {
          duration: Infinity,
          action: { label: 'Reload', onClick: () => void update(true) },
        })
      },
    })
  }, [])

  return null
}
