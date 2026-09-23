import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { capitalise } from '@/lib/format'
import type { CollectionDef } from './types'
import { isUnsynced, UNSYNCED_REASON } from './unsynced'

/**
 * Writes a record back through the collection's own `save`.
 *
 * The register, the record dialog and the pickers are dropped for every
 * mutation in the app at once — see `dropDerivedReads` — so what is left here
 * is the one thing a query cache cannot reach.
 */
/**
 * Only ever the direct path. A write that goes through the outbox is accepted
 * on the device and returns at once, so the form calls it straight rather than
 * wrapping something synchronous in a mutation — see `collection-form.tsx`.
 */
export function useSaveRecord(definition: CollectionDef, editing: boolean) {
  const router = useRouter()

  return useMutation({
    mutationFn: async ({
      values,
      recordId,
    }: {
      values: Record<string, unknown>
      recordId?: string
    }) => {
      // As in `useRemoveRecord`: the edit route is already withheld from an
      // unsynced record, so reaching this means something got past it, and an
      // update naming an id the school has never issued is worse than a refusal.
      if (recordId && isUnsynced({ id: recordId })) throw new Error(UNSYNCED_REASON)
      return definition.save!(values, recordId)
    },
    // "Student created", to read like every other toast in the app.
    meta: {
      success: `${capitalise(definition.noun)} ${editing ? 'updated' : 'created'}`,
    },
    /*
     * A record that is still a page reads from the route's loader, which no
     * query invalidation reaches — the form goes back to it the moment this
     * resolves, and would land on the values it was opened with.
     *
     */
    onSuccess: () => router.invalidate(),
  })
}
