import { DRAFT_FIELDS, type ApplicationValues } from './schema'

const KEY = 'netpro.apply.draft'

/**
 * What has been typed so far, kept for this tab alone.
 *
 * The form is long and the connection it is filled in over is not: a reload
 * after a dropped page, or a phone that discarded the tab, would otherwise
 * cost ten minutes of typing. `sessionStorage` rather than `localStorage`,
 * because this is a child's birthday and a family's phone numbers, and the
 * machine may be a café's — a draft that outlived the tab would be read by the
 * next person to open the page. Every access is
 * guarded: storage can be blocked, full or absent, and a draft is a
 * convenience, never a reason for the form not to open.
 */
export function readDraft(): Partial<ApplicationValues> {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return {}
    const saved = JSON.parse(raw) as Record<string, unknown>
    const draft: Record<string, unknown> = {}
    for (const field of DRAFT_FIELDS) {
      const value = saved[field]
      if (field === 'dob') {
        const date = typeof value === 'string' ? new Date(value) : undefined
        if (date && !Number.isNaN(date.getTime())) draft.dob = date
      } else if (typeof value === 'string') {
        draft[field] = value
      }
    }
    return draft as Partial<ApplicationValues>
  } catch {
    return {}
  }
}

export function saveDraft(values: Partial<ApplicationValues>) {
  try {
    const kept = Object.fromEntries(DRAFT_FIELDS.map((field) => [field, values[field]]))
    sessionStorage.setItem(KEY, JSON.stringify(kept))
  } catch {
    // A draft that cannot be kept is a draft that is not kept.
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
