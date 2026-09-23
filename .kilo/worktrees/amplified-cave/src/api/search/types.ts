/**
 * One term across the student, guardian and staff registers, at `GET /search`.
 *
 * Somebody rings the office about "Okafor" and it could be the student, the
 * father who pays the fees, or the teacher who takes them for English. This
 * is the office's answer to that call: three registers, one box.
 *
 * **Read off a live answer on 2026-09-09**, populated — every field below has
 * been seen with something in it, which makes this the only one of the three
 * new families with nothing left to guess at.
 *
 * What the server does with a term, worth knowing before building the box:
 *
 * - **Words are matched separately**, so "Chidi Okafor" finds a student whose
 *   first and last names live in two columns.
 * - **A phone number is one thing**, compared with the separators stripped,
 *   so it matches however it was typed.
 * - It also searches registration numbers, e-mails, the username somebody
 *   signs in with, a student's middle name, and **both** parents' names and
 *   phones — one guardian record holds two people.
 * - An empty or one-character term is a **200 with empty lists** and a
 *   message saying what to type. It is not an error and must not be shown as
 *   one.
 */

/** Which register a row came from. Carried on the row itself, singular. */
export type SearchKind = 'student' | 'parent' | 'teacher'

/**
 * The same three registers as the server names them where it is talking about
 * the *register* rather than a row — the keys of `counts`, and the entries of
 * `searched`. Plural, and deliberately a separate type: mixing the two is how
 * a lookup ends up keyed on "student" against a count filed under "students".
 */
export type SearchRegister = 'students' | 'parents' | 'teachers'

/**
 * Where the server would send a browser for this row — a CakePHP route array,
 * with the id under the key `"0"`.
 *
 * **Nothing in this app follows it.** It names the school's own server-rendered
 * controllers, not this portal's routes. A row is opened from its `kind` and
 * `id` instead: `/students/{id}`, `/sparents/{id}`, `/teachers/{id}`. It is
 * typed here only so that it is visibly ignored rather than accidentally
 * relied on.
 */
export type SearchRowUrl = {
  '0'?: number
  controller?: string
  action?: string
}

/**
 * One hit, in whichever register it was found.
 *
 * `detail` and `contact` are **pre-joined display strings**, already put
 * together by the server with a `·` between the parts — a student's
 * "NETPRO/2026/2 · JSS 1 · JSS1 A · Admitted", a guardian's status and
 * address. They are shown as they arrived; there are no separate fields
 * behind them to lay out differently, and splitting on the separator would
 * break on the first address that contains one.
 *
 * A guardian's `name` is both people — "Udoye Okagbue & Mgbeke Nuche" — which
 * is the record, not a formatting accident. See the note in memory about
 * `/sparents`.
 */
export type SearchRow = {
  kind: SearchKind
  /** The record's id in its own register, so `/students/{id}` and friends. */
  id: number
  name: string
  detail: string | null
  contact: string | null
  url?: SearchRowUrl
}

export type SearchParams = {
  /** At least 2 characters. Required. */
  q: string
  /** Per register, 1–50. Defaults to 10 at the server. */
  limit?: number
}

/**
 * `GET /search`.
 *
 * Two things about it that a screen has to honour:
 *
 * - **`counts` are the real totals even when the lists are cut to `limit`.**
 *   So a list of ten under a count of forty is correct, and the screen says
 *   "showing 10 of 40" rather than quietly implying ten is all there is.
 * - **`searched` says which registers were actually looked in.** This does
 *   not go round the privilege system: Students and Sparents both sit behind
 *   the Student privilege, and an admin without it gets neither — with those
 *   registers absent from `searched`. An empty `students` list means "nobody
 *   called that"; `students` missing from `searched` means "you were not
 *   allowed to look", and a screen that shows both as "no results" tells an
 *   administrator the school has no such student when it may well have.
 *
 * The sentence summarising the hits — "2 students, 1 guardian matching
 * \"Obi\"." — is on the envelope's `message`, which `request()` unwraps away.
 * It is a summary of `counts`, so a screen composes its own from those rather
 * than reaching for it.
 */
export type SearchResults = {
  /** The term as the server understood it. */
  query: string
  students: SearchRow[]
  parents: SearchRow[]
  teachers: SearchRow[]
  /** Real totals per register, whatever `limit` cut the lists to. */
  counts: Record<SearchRegister, number>
  total: number
  /** The registers this caller's privileges actually allowed. */
  searched: SearchRegister[]
  limit: number
}
