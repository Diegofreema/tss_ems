import type { FieldSpec } from '../collections/types.ts'

export type ProfileField = FieldSpec & {
  /** Held by the school office — shown as a read-only block, never an input. */
  locked?: boolean
}

/**
 * Saving belongs to whoever owns the record — the office record is `PATCH
 * /users/profile`, a teaching record is `POST /teachers/me`, and a pupil or a
 * guardian has no endpoint at all. The page only collects the form, so the
 * portal hands it this; left out, the record is read-only and the buttons go.
 */
export type ProfileSave = {
  pending: boolean
  save: (values: Record<string, unknown>) => Promise<void>
}

export type ProfilePref = {
  label: string
  hint: string
  on: boolean
}

/**
 * One of these per portal. The page is identical in all four — only the person,
 * which fields the office controls, and the wording change.
 */
export type ProfileConfig = {
  initials: string
  /** The line under the name, e.g. "STF-014 · Mathematics · SS1 A, SS2 A". */
  meta: string
  /** Why some of the fields below cannot be edited here. */
  note: string
  fields: ProfileField[]
  /** Current values, keyed as the fields are. */
  values: Record<string, string>
  account: { label: string; value: string }[]
  prefs: ProfilePref[]
  /**
   * The config was built from the person's own record rather than written
   * down, so the session has nothing left to fill in — and must not, since the
   * login it holds is a different row with a different name and phone from the
   * office record the Save button writes to.
   */
  fromRecord?: boolean
  /** What signing the other devices out means for this role. */
  sessionNote: string
}
