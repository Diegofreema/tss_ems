import { freshen } from '@/db/collection'
import type { AskableSet } from '@/db/freshen'
import { queryClient } from '@/lib/query-client'
import type { CollectionDef, ListPath } from './types'

/**
 * Opening a register asks the school for what it draws.
 *
 * A route loader's one line. The definition already names every set its rows
 * are built from — the register's own, and the one or two it joins to put a
 * name to an id — so a page says which endpoints it lives on by saying which
 * definition it draws, and nothing has to be listed twice.
 *
 * The count tiles above the register are dropped once the answers land, not
 * beside them. They are a react-query read *built out of* the set rather than
 * a live query over it (`collection-summary.tsx` counts `heldRows` under
 * `['collection', path, 'summary']` and holds it for a minute), so a drop
 * issued while the refetch was still in flight would re-count the rows being
 * replaced and write them back as fresh — three tiles disagreeing with the
 * register under them until something else happened to move them. Same race as
 * the one `dropDerivedReads` documents after a write, met on the way into a
 * page instead of on the way out of a form.
 *
 * Only this register's key is dropped, not every derived read in the app: a
 * navigation is not a write, and nothing else on the device has changed.
 *
 * `also` is for a page that opens onto more than its own rows — the set
 * assignments register's record tabs read the questions and the scripts, which
 * fan out per assignment and are synced by the page that wants them rather
 * than by the shell. Naming them here asks for them on the same visit.
 */
export function freshenRegister(
  definition: CollectionDef,
  ...also: readonly (AskableSet | undefined)[]
): Promise<void> {
  const bound = definition.collection

  return freshenPage(definition.path, [
    bound?.entities,
    bound?.lookup,
    bound?.alsoLookup,
    ...also,
  ])
}

/**
 * The same, for a register the route cannot name.
 *
 * The parent portal builds its definitions in the component out of the
 * household — `childrenFor(useFamily())` — so there is no definition to hand a
 * loader, only the page it is for. The drop matters more here than anywhere:
 * those definitions carry their rows on `rows` rather than a binding, and
 * `collectionQuery` keys on the path alone, so a definition rebuilt from a
 * fresher household hands the same key back to react-query and the register
 * goes on drawing the rows it cached. The refetch is invisible without this.
 */
export function freshenPage(
  path: ListPath,
  sets: readonly (AskableSet | undefined)[],
): Promise<void> {
  return freshen(sets, () =>
    queryClient.invalidateQueries({ queryKey: ['collection', path] }),
  )
}
