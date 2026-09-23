/**
 * Anything that carries a term. Both the teacher's own marks and the office's
 * results register spell it the same way, which is what lets one function read
 * either — see `termFromResults`.
 */
export type TermBearing = {
  session_id?: number | null
  semester_id?: number | null
  uploaddate?: string | null
  session?: { id: number; name: string } | null
  semester?: { id: number; name: string } | null
}

/**
 * Which term a teacher's marks are filed into.
 *
 * `POST /teachers/me/scores` and the results upload both want a session and a
 * term as ids, and a teaching login cannot read either: `/sessions`,
 * `/semesters` and `/settings` all answer "restricted to administrators". The
 * only place the school tells a teacher what term it is, is on their own
 * marks — which expand both, by id and by name.
 *
 * So the term is read off the newest mark they have — and, for a teacher who
 * has none, off the newest mark on the school's own results register, which
 * `/results` opens to any staff login. That second reading is what lets a
 * teacher file their very first mark: without it the sheet was permanently
 * unsaveable for anybody new, which is every teacher at the start of their
 * first term here.
 *
 * Both readings are the same arithmetic over the same fields, so one function
 * takes either shape.
 */
export type MarkingTerm = {
  session_id: number
  semester_id: number
  /** "First Term · 2024/2025", as the school itself spells them. */
  label: string
}

function at(stamp: string | null | undefined): number {
  const parsed = new Date(stamp ?? '').getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

/** `"3:1"` — the pair, as one value a picker and a URL can both hold. */
export function termKey(term: { session_id: number; semester_id: number }): string {
  return `${term.session_id}:${term.semester_id}`
}

function named(bearing: TermBearing, session: number, semester: number): MarkingTerm {
  return {
    session_id: session,
    semester_id: semester,
    label:
      [bearing.semester?.name, bearing.session?.name].filter(Boolean).join(' · ') ||
      `Term ${semester} · session ${session}`,
  }
}

/**
 * Every term the school is known to have filed into, newest first.
 *
 * This is the whole of what a teaching login can know about the calendar, and
 * it is worth being plain about why: `/sessions`, `/semesters`, `/settings`
 * and `/subjects/options` all answer "restricted to administrators" — measured
 * again on 2026-09-18 — so there is no list of terms to fetch. A mark is the
 * only place the school tells a teacher what term it is, and it tells them by
 * carrying the pair with the name of each beside it.
 *
 * So a picker built on this offers the terms that exist in the data rather
 * than the terms that exist. A term nobody has filed a single mark into cannot
 * be offered, because nothing a teacher may read has ever named it. The day
 * those endpoints open to teaching logins, this stops being the source and the
 * real lists take over.
 *
 * Deduplicated on the pair and dated by the newest mark in each, so the order
 * is the school's own chronology rather than the order rows happened to arrive.
 */
export function termsFromResults(results: readonly TermBearing[]): MarkingTerm[] {
  const seen = new Map<string, { term: MarkingTerm; at: number }>()

  for (const result of results) {
    const session = result.session_id
    const semester = result.semester_id
    if (!session || !semester) continue

    const key = `${session}:${semester}`
    const when = at(result.uploaddate)
    const held = seen.get(key)
    // The newest mark of a term is the one whose names are used, and the one
    // whose date orders it.
    if (!held || when > held.at) seen.set(key, { term: named(result, session, semester), at: when })
  }

  return [...seen.values()].sort((one, two) => two.at - one.at).map((held) => held.term)
}

/**
 * The one term to file into unless somebody says otherwise: the newest.
 *
 * Built off the list rather than separately, so the default is always one of
 * the options offered — a sheet defaulting to a term its own picker does not
 * list is the kind of thing nobody notices until a mark lands in the wrong
 * year.
 */
export function termFromResults(results: readonly TermBearing[]): MarkingTerm | undefined {
  return termsFromResults(results)[0]
}

/** A session or a term as the school lists it. */
export type NamedRecord = { id: number; name: string }

/**
 * The term a sheet files into, given what the school offers and what the
 * teacher picked.
 *
 * Four rules, in order, and each of them is a thing that goes wrong otherwise:
 *
 * 1. **What the teacher picked**, where it names something the school lists.
 * 2. **What their marks say**, which is where the sheet opened before there
 *    was anything to pick and is still the best default — it is where their
 *    marks have been going.
 * 3. **The top of each list**, so a teacher who has never filed a mark still
 *    gets a sheet they can save rather than a picker with nothing chosen.
 * 4. **The inferred term untouched** where the school lists nothing at all.
 *    `/sessions` and `/semesters` answer "restricted to administrators" to a
 *    teaching login as things stand, so this is the live case today, and it is
 *    exactly the behaviour the sheet had before the pickers existed.
 *
 * A URL naming a session the school does not have is not honoured: a link can
 * say anything, and a mark filed into a year nobody has heard of is worse than
 * one filed into the obvious term.
 */
export function chosenTerm(
  sessions: readonly NamedRecord[],
  terms: readonly NamedRecord[],
  chosen: { session?: string | null; term?: string | null },
  inferred: MarkingTerm | undefined,
): MarkingTerm | undefined {
  const session = pick(sessions, chosen.session, inferred?.session_id)
  const term = pick(terms, chosen.term, inferred?.semester_id)
  if (!session || !term) return inferred

  return {
    session_id: session.id,
    semester_id: term.id,
    label: `${term.name} · ${session.name}`,
  }
}

function pick(
  list: readonly NamedRecord[],
  chosen: string | null | undefined,
  inferredId: number | undefined,
): NamedRecord | undefined {
  return (
    list.find((one) => String(one.id) === chosen) ??
    list.find((one) => one.id === inferredId) ??
    list[0]
  )
}
