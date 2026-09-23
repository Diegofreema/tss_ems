/** The one settings row, grouped as the API returns it. */
export type SchoolSettings = {
  /**
   * **The library's late fee, despite the name.** `regfee` reads as a
   * registration fee and is nothing of the sort: it is what a pupil is charged
   * for bringing a book back after its due date. Named here rather than left
   * to the index signature below precisely because the name misleads — the
   * next person to meet it should meet this sentence with it.
   *
   * Not to be confused with `/loanedbooks/summary`'s `fine_per_day`, which is
   * the other half of the arithmetic.
   */
  regfee?: number | string | null
  /** Scalar fields — name, address, rector, regno format and so on. */
  prefixes?: Record<string, unknown>
  /** Crest and stamp, with ready-made URLs. */
  images?: Record<string, string>
  /** What the school is in right now, and the two dates the office sets. */
  calendar?: {
    session_id?: number
    session?: string
    semester_id?: number
    semester?: string
    /** Written DD/MM/YYYY, the way the API stores it. */
    current_term_ends?: string
    next_term_begins?: string
  }
  [key: string]: unknown
}

/** The sessions and terms the calendar pickers offer. */
export type SettingsOptions = Record<string, unknown>

/**
 * Dates accept YYYY-MM-DD or DD/MM/YYYY and are stored as DD/MM/YYYY. The
 * crest and stamp are files and can only be changed through the web form.
 */
export type SettingsBody = {
  name?: string
  /**
   * The library's late fee. Sent under the same key it is read under, which is
   * the convention every other flat scalar on this row follows — only the
   * nested ones are renamed on the way out (`prefixes.regno_format` →
   * `regnoformat`). **Unverified against a live save**, unlike the rest of this
   * body; if the endpoint ignores it, this is the name to question first.
   */
  regfee?: number
  phone?: string
  email?: string
  address?: string
  rector?: string
  rectorcerts?: string
  registrar?: string
  registrarcerts?: string
  currenttermends?: string
  nexttermbegins?: string
  regnoformat?: string
  application_no_prefix?: string
  session_id?: number
}
