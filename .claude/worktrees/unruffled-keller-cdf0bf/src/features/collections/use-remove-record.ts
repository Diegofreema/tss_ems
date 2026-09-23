import { useMutation, useQueryClient } from '@tanstack/react-query'
import { capitalise } from '@/lib/format'
import type { CollectionDef } from './types'

/**
 * Deletes a record through the collection's own `remove`, then drops the
 * cached list so the register stops showing a row the API no longer has.
 *
 * Only ever reached behind a confirm — the button that opens one is drawn by
 * the list and by the record's own form, and both hand the deletion here so
 * there is one place that knows what a delete invalidates.
 */
export function useRemoveRecord(definition: CollectionDef) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recordId: string) => definition.remove!(recordId),
    meta: { success: `${capitalise(definition.noun)} deleted` },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['collection', definition.path] }),
  })
}
