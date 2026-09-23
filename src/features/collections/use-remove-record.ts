import { useMutation } from '@tanstack/react-query'
import { capitalise } from '@/lib/format'
import type { CollectionDef } from './types'
import { isUnsynced, UNSYNCED_REASON } from './unsynced'

/**
 * Deletes a record through the collection's own `remove`.
 *
 * The register, the record dialog and the pickers are dropped for every
 * mutation at once — see `dropDerivedReads` — so the deleted row stops being
 * shown and stops being offered without anything being asked for here.
 *
 * The router is deliberately left alone, unlike a save: the caller navigates to
 * the register once this resolves, and re-running the loader of the record that
 * has just been deleted only raises a 404 on the way out.
 *
 * Only ever reached behind a confirm — the button that opens one is drawn by
 * the list and by the record's own form, and both hand the deletion here so
 * there is one place that knows what a delete costs.
 */
export function useRemoveRecord(definition: CollectionDef) {
  const queued = definition.queueRemove

  return useMutation({
    // Synchronous where it queues, which is fine here: unlike the save form,
    // the confirm dialog only awaits this to keep its button spinning, and a
    // promise that has already resolved simply closes it.
    mutationFn: async (recordId: string) => {
      // The buttons that lead here are already withheld from an unsynced
      // record, so reaching this means something got past them — a URL, a
      // stale render. Refusing loudly beats sending a delete for an id the
      // school has never issued.
      if (isUnsynced({ id: recordId })) throw new Error(UNSYNCED_REASON)
      return queued ? queued(recordId) : definition.remove!(recordId)
    },
    // A queued delete says the same sentence, but the queue is what says it —
    // and adds "saved on this device" when it had to wait.
    meta: queued ? undefined : { success: `${capitalise(definition.noun)} deleted` },
  })
}
