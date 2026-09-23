/** What a select submits and what it shows. The value is the API's own id. */
export type Option = { value: string; label: string }

/**
 * The feeds shared across the record forms. A field names one of these rather
 * than listing choices, so every form offers the same classes, arms and
 * guardians the API knows about.
 */
export type OptionsKey =
  | 'classes'
  | 'arms'
  | 'guardians'
  | 'teachers'
  | 'students'
  | 'fees'
  | 'subjects'
  /** The signed-in teacher's own subjects — `/subjects` is the office's. */
  | 'my-subjects'
  /** The arms the signed-in teacher takes, from their own roll. */
  | 'my-arms'
  /** The classes the signed-in teacher reaches — `/departments` is the office's. */
  | 'my-classes'
  /** The four ways the school takes money at the counter. */
  | 'payment-methods'
  /** Super Admin, Bursar, Secretary — what kind of login an account is. */
  | 'roles'
  /** Every country, off `country-state-city`; the value is the ISO code. */
  | 'countries'
  /** The states of the chosen country, valued by the school's own id. */
  | 'states'
  /** The school years on record — 2024/2025, newest first. */
  | 'sessions'
  /** First, Second and Third Term. The API's table calls them semesters. */
  | 'terms'
  /** Who a notice may be addressed to, as the notice board itself lists them. */
  | 'audiences'

/**
 * A choice as a definition writes it: a bare string where the value and the
 * label are the same word, and a pair where they differ — the invoice status
 * the API calls `success` is the one an office calls Paid.
 */
export type Choice = string | Option

/** Choices whose value is the text itself — a gender, a status, a term. */
export function toOptions(choices: readonly Choice[]): Option[] {
  return choices.map((choice) =>
    typeof choice === 'string' ? { value: choice, label: choice } : choice,
  )
}

/**
 * Options a reader can actually tell apart.
 *
 * This school has two classes both named SSS I, and both coded SSS I too, so
 * a dropdown built straight off the names offers the same word twice with no
 * way to know which one was picked. Only a repeated label is given anything
 * extra — whatever `meta` the feed could find, and failing that the record's
 * own id, which at least differs. A label that is already unique is left
 * exactly as the school wrote it.
 */
export function distinct(options: readonly (Option & { meta?: string })[]): Option[] {
  const seen = new Map<string, number>()
  for (const one of options) seen.set(one.label, (seen.get(one.label) ?? 0) + 1)

  return options.map(({ value, label, meta }) =>
    (seen.get(label) ?? 0) < 2
      ? { value, label }
      : { value, label: `${label} · ${meta?.trim() || `#${value}`}` },
  )
}
