import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { useConfirm } from '@/hooks/use-confirm'
import type { CollectionDef, Row } from './types'
import { isUnsynced, UNSYNCED_REASON } from './unsynced'

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
  const router = useRouter()
  const spec = definition.rowAction

  const mutation = useMutation({
    mutationFn: (row: Row) => {
      // The same rule the edit route and the delete button follow: nothing may
      // be done to a record the school has never heard of, because the write
      // would name an id that does not exist. Making a session current is the
      // case in point — it is a setting pointing at a row.
      if (isUnsynced(row)) throw new Error(UNSYNCED_REASON)
      return spec!.run!(row)
    },
    onSuccess: async (_data, row) => {
      toast.success(spec!.done(row))
      // The register and the record dialog go with every other mutation's, in
      // `dropDerivedReads`. The records that are still pages read from the
      // route's loader, where no invalidation reaches them.
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
    /**
     * The spec, with its label withheld from a row this device wrote and the
     * school has not seen. A label that returns nothing leaves the row alone —
     * the register's own rule — so the button simply is not offered, which is
     * better than offering one that refuses.
     */
    spec: spec && {
      ...spec,
      label: (row: Row) => (isUnsynced(row) ? undefined : spec.label(row)),
    },
    pending,
    /**
     * A state the person on the row will feel either way is asked about, in
     * danger where it is taken and in brand where it is given back. A spec with
     * nothing to say about this row runs on the first click.
     */
    ask: (row: Row) => {
      // Whichever way it was reached, a second press while the first is still
      // in flight would take the state twice.
      if (mutation.isPending) return
      if (isUnsynced(row)) return

      /*
       * Called straight rather than through a mutation — the same reason the
       * save form does — and awaited, because it now goes to the school before
       * it comes back: the confirm's button spins for the round trip, and the
       * router is not invalidated until there is something new to read. The
       * queue raises its own toast either way, so this one does not.
       */
      const queued = spec?.queueRun
      const takeIt = queued
        ? async () => {
            await queued(row)
            await router.invalidate()
          }
        : () => mutation.mutateAsync(row)

      const body = spec?.confirm?.(row)
      if (!body) return void takeIt()
      confirm.ask({
        title: spec!.title?.(row) ?? `${spec!.label(row)} this ${definition.noun}?`,
        body,
        subject: row[definition.nameKey],
        cta: spec!.cta?.(row) ?? `${spec!.label(row)} the ${definition.noun}`,
        // Nothing is being kept or thrown away here, unlike a delete.
        cancel: 'Go back',
        tone: spec!.tone?.(row),
        // Handed back rather than fired and forgotten, so the dialog stays up
        // with its button spinning until the write has been taken — by the
        // school on the direct path, by the device on the queued one.
        onConfirm: takeIt,
      })
    },
  }
}
