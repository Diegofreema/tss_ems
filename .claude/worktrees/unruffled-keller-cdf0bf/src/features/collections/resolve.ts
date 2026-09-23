import { ApiError } from '@/api/client'
import type { CollectionDef, CrumbLink, RecordPath } from './types'

export type Heading = {
  title: string
  crumb: string
  /** Where the crumb leads. Absent on a crumb that names no page of its own. */
  crumbTo?: CrumbLink
}

export type Registry = Record<string, CollectionDef>

/** Looks a collection up by its URL segment; undefined means 404. */
export function loadCollection(registry: Registry, id: string) {
  const definition = registry[id]
  if (!definition) return undefined
  return {
    definition,
    heading: {
      title: definition.action,
      crumb: `${definition.kicker} · ${definition.title}`,
      crumbTo: { to: definition.path },
    } satisfies Heading,
  }
}

/**
 * One record, by URL. A live collection is asked for it directly — the row may
 * be on a page this browser never loaded, so there is nothing local to search.
 *
 * A record that does not come back is not a wrong URL: the page is the right
 * page and the data is missing, so this resolves with `record` undefined and
 * the detail renders that state in the shell. Only an unknown collection —
 * a URL that names no register at all — is a 404.
 */
export async function loadRecord(registry: Registry, id: string, recordId: string) {
  const definition = registry[id]
  if (!definition) return undefined

  const record = definition.record
    // A record the API does not have is a missing record, not a failure —
    // anything else that went wrong is left to throw and reach the boundary.
    ? await definition.record(recordId).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return undefined
        throw error
      })
    : definition.rows?.find((row) => row.id === recordId)

  return {
    definition,
    record,
    heading: {
      title: record ? record[definition.nameKey] : 'Record not found',
      crumb: `${definition.kicker} · ${definition.title}`,
      crumbTo: { to: definition.path },
    } satisfies Heading,
  }
}

export async function loadRecordForEdit(
  registry: Registry,
  id: string,
  recordId: string,
  /** Where this portal mounts its record pages — the crumb names one. */
  recordPath: RecordPath,
) {
  const loaded = await loadRecord(registry, id, recordId)
  // Reachable by URL even where no button offers it, so the guard lives here
  // rather than only on the page that draws the pencil. A record that did not
  // come back has nothing to edit, so that one stays a 404.
  if (!loaded?.record || loaded.definition.readonly) return undefined
  return {
    ...loaded,
    record: loaded.record,
    heading: {
      title: `Edit ${loaded.definition.noun}`,
      crumb: `${loaded.definition.kicker} · ${loaded.record[loaded.definition.nameKey]}`,
      // The crumb names the record, so that is where it goes — the register
      // it belongs to is a step further up, and the crumb never said it.
      crumbTo: { to: recordPath, params: { collection: id, recordId } },
    } satisfies Heading,
  }
}
