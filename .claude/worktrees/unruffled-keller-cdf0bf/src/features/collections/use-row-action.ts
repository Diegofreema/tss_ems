import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { useConfirm } from '@/hooks/use-confirm'
import type { CollectionDef, Row } from './types'

/**
 * Runs a collection's row action — from the register or from the record's own
 * page — then drops the cached list and record so both read the state the API
 * actually stored.
 *
 * The page's `useConfirm` is passed in rather than held here, so a list that
 * already confirms deletes keeps one dialog rather than mounting a second.
 *
 * The toast is raised here rather than declared as `meta`, which is one static
 * sentence per hook: an action that toggles has a different thing to say about
 * each row, and it can only name the record once it has one. Failures still go
 * through the mutation cache like every other.
 */
export function useRowAction(
  definition: CollectionDef,
  confirm: ReturnType<typeof useConfirm>,
) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const spec = definition.rowAction

  const mutation = useMutation({
    mutationFn: (row: Row) => spec!.run(row),
    onSuccess: async (_data, row) => {
      toast.success(spec!.done(row))
      await queryClient.invalidateQueries({
        queryKey: ['collection', definition.path],
      })
      // The record page reads its record from the route's loader rather than
      // the query cache, so the list's invalidation never reaches it.
      await router.invalidate()
    },
  })

  /**
   * The write is on one row, so the spinner is too — read off the variables
   * react-query is already holding rather than tracked separately here.
   */
  const pending = (row: Row) =>
    mutation.isPending && mutation.variables?.id === row.id

  return {
    spec,
    pending,
    /**
     * Taking a state away is asked about; putting one back is not, so a spec
     * with nothing to say runs on the first click.
     */
    ask: (row: Row) => {
      // Whichever way it was reached, a second press while the first is still
      // in flight would take the state twice.
      if (mutation.isPending) return
      const body = spec?.confirm?.(row)
      if (!body) return void mutation.mutate(row)
      confirm.ask({
        title: spec!.title?.(row) ?? `${spec!.label(row)} this ${definition.noun}?`,
        body,
        subject: row[definition.nameKey],
        cta: spec!.cta?.(row) ?? `${spec!.label(row)} the ${definition.noun}`,
        // Nothing is being kept or thrown away here, unlike a delete.
        cancel: 'Go back',
        // Handed back rather than fired and forgotten, so the dialog stays up
        // with its button spinning until the API has actually answered.
        onConfirm: () => mutation.mutateAsync(row),
      })
    },
  }
}
