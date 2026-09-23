import { queryOptions } from '@tanstack/react-query'
import { libraryService } from '@/api/library/service'
import { parentsService } from '@/api/parents/service'
import { studentsService } from '@/api/students/service'
import { heldDocument, heldRows as held, refetchCollection } from '@/db/collection'
import {
  refArms,
  refBoard,
  refBooks,
  refLoans,
  refClasses,
  refFees,
  refGuardians,
  refMethods,
  refRoles,
  refSessions,
  refStudents,
  refSubjects,
  refTeachers,
  refTerms,
} from '@/db/collections/reference'
import { teacherArms, teacherSubjects } from '@/db/collections/teaching'
import { SET } from '@/db/ids'
import { queryClient } from '@/lib/query-client'
import { methodOptions } from './payment-methods'
import { myClasses } from './my-classes'
import { guardianOption } from './guardian-option'
import { audienceOptions } from '@/portals/admin/collections/notice-row'
import { lendableCount, lendingLabel } from '../library/book-read'
import { loanBookId, loanReturned } from '../library/loan-read'
import { distinct, type Option, type OptionsKey, type SearchKey } from './options'

/**
 * Every feed here reads a set on the device, and the two that matter most ask
 * the school first.
 *
 * Reading the device is what makes a form fillable with no connection — a
 * dropdown that had to be fetched is a form that cannot be filled in — and it
 * is why the ones that used to ask the API for a *narrowed* answer now ask for
 * the whole set and narrow it here. A set narrowed at the fetch cannot be
 * widened later without a second request, and there may be no connection to
 * make one over.
 *
 * Classes and arms are the exception, because they are the only reference data
 * a school changes while the office is working: an arm opened on the
 * registrar's machine at ten is wanted on the bursar's at two, and until this
 * device happened to resync it was not on the list. Those feeds refetch on
 * every open — see `ALWAYS_ASK` — and fall back to the stored copy only when
 * the school cannot be reached. Freshness is the normal case; the device's own
 * answer is the outage.
 *
 * The react-query wrapper below stays: it is what the select components
 * already speak.
 */

/**
 * The feeds that ask the school every time they are opened.
 *
 * The school's own shape: the classes and arms it runs, the subjects it
 * offers, the sessions and terms it keeps time by. All of it is created on
 * whichever machine the office happened to be sitting at — an arm opened on
 * the registrar's at ten is wanted on the bursar's at two — and a dropdown
 * that cannot offer it is a form nobody can fill in correctly.
 *
 * The fee list and the catalogue are here for a second reason as well as that
 * one, and it is the stronger of the two. Both are added to and retired by
 * whoever is at the machine, so they have the arms' problem — but each is also
 * offered through a *filter on its own status*: the fee picker shows only
 * `status === 1`, and the lending counter only `isavailable === 'Available'`.
 * That is the office's own state rather than a fact about the school, and the
 * counter is exactly where a stale copy shows. A fee retired this morning was
 * still offered to be charged; a book withdrawn this morning was still offered
 * to be lent. **A picker that filters on a mutable status cannot be read off a
 * copy of unknown age** — it does not merely lag, it offers something the
 * school will refuse, and it does it on a form that looks complete.
 *
 * The catalogue's own entry here is `all-books`, the edit flow's unfiltered
 * list, since the list a librarian corrects is the one that must be current.
 * The lending field no longer appears in this list at all: it searches the
 * endpoint a keystroke at a time (`searchFeed`), which asks the school by
 * definition and never holds a catalogue to go stale.
 *
 * Everything else here is either not created mid-session or is far too large
 * to re-ask for on the opening of a field: the student and guardian
 * directories run to hundreds of rows each, and the searched feeds already ask
 * the school by their own route.
 */
const ALWAYS_ASK: readonly OptionsKey[] = [
  'classes',
  'arms',
  'all-arms',
  'subjects',
  'sessions',
  'terms',
  'all-books',
  'fees',
]

/**
 * Asks the school for a set and then reads it back.
 *
 * Through the collection rather than the service directly, for two reasons.
 * There is one answer on the device, so a class the dropdown can offer is a
 * class the register beside it also knows about — two readers of the same
 * endpoint would be two lists that can disagree. And the collection's own
 * fetcher already decides what to do when the school cannot be reached: it
 * hands back the last thing the school said. So this is "ask every time" with
 * the device's copy as the answer of last resort, not as the source.
 */
async function asked<T extends object>(
  id: string,
  collection: { preload: () => Promise<void>; toArrayWhenReady: () => Promise<T[]> },
): Promise<T[]> {
  // Never throws for a device that has synced this set before; a device that
  // has not is left to `held` below, which says so.
  await refetchCollection(id).catch(() => undefined)
  return held(collection)
}

export function optionsQuery(key: OptionsKey, dependsOn: string) {
  return queryOptions({
    queryKey: ['options', key, dependsOn],
    queryFn: () => fetchOptions(key, dependsOn),
    /*
     * Reference data changes when the school is reorganised, not mid-form —
     * except for the two the office really does create mid-session, which are
     * asked for afresh every time a field holding them is opened.
     */
    staleTime: ALWAYS_ASK.includes(key) ? 0 : 5 * 60_000,
    /**
     * Deliberately `always`, not the app's default.
     *
     * Under `online` react-query pauses without running the function at all, so
     * a feed the office had not already opened stayed on "Loading…" for as long
     * as the device was offline — which is every dependent feed, since an arm
     * feed is keyed by the class chosen and no class had been chosen before.
     * The reading is off the device now and can always finish, so letting it
     * run is what makes the form fillable.
     */
    networkMode: 'always',
  })
}

async function fetchOptions(key: OptionsKey, dependsOn: string): Promise<Option[]> {
  if (key === 'classes') {
    const items = await asked(SET.refClasses, refClasses)
    return distinct(
      items.map((department) => ({
        value: String(department.id),
        label: department.name,
        // Most schools code a class differently from its name; this one does
        // not, so the code is only offered where it says something new.
        meta: department.deptcode === department.name ? '' : department.deptcode,
      })),
    )
  }

  if (key === 'audiences') {
    // The board publishes its own catalogue beside its list, so the form
    // offers exactly what the endpoint will accept rather than a copy of it
    // that can drift.
    return audienceOptions((await heldDocument(refBoard))?.audiences ?? [])
  }

  if (key === 'arms') {
    // An arm only means something inside a class, so this feed stays empty
    // until one is chosen rather than offering every arm in the school.
    if (!dependsOn) return []
    // Narrowed here rather than by `class-arms/for-department/{id}`, which is a
    // different answer per class and so cannot be a set on the device. An arm
    // carries the class it belongs to, so the same answer is this set filtered
    // — and filtered without a request.
    const arms = (await asked(SET.refArms, refArms)).filter(
      (arm) => String(arm.department_id) === String(dependsOn),
    )
    // The endpoint's own label reads "JSS 1 - JSS1 A" — class and arm together,
    // which is what makes the choice unambiguous where two classes both have
    // an A — so it is spelled the same way here.
    return arms.map((arm) => ({
      value: String(arm.id),
      label: [arm.department, arm.arm_name].filter(Boolean).join(' - ') || arm.arm_name,
    }))
  }

  if (key === 'all-arms') {
    // Unlike `arms`, this is not narrowed by a class: a teacher's arm has
    // nothing to do with the department they teach, so the whole school's arms
    // are offered, each labelled with its class to keep an "A" from every "A".
    const items = await asked(SET.refArms, refArms)
    return items.map((arm) => ({
      value: String(arm.id),
      label: [arm.department, arm.arm_name].filter(Boolean).join(' \u00b7 ') || arm.arm_name,
    }))
  }

  if (key === 'students') {
    // Admitted alone, filtered here rather than at the fetch: the set on the
    // device is the whole register, because the office's own list and the
    // applicants beside it read the same one.
    return (await held(refStudents))
      .filter((student) => student.status === 'Admitted')
      .map(studentOption)
  }

  if (key === 'all-books') {
    // Every title, for the edit flow — a retired one is exactly the title an
    // office may need to fix or put back on lending, so nothing is filtered.
    const books = await asked(SET.refBooks, refBooks)
    return distinct(
      books.map((book) => ({
        value: String(book.id),
        label:
          lendingLabel(book) === 'Available' ? book.title : `${book.title} · ${lendingLabel(book).toLowerCase()}`,
        meta: book.author ?? '',
      })),
    )
  }

  if (key === 'fees') {
    // Retired fees are left out: an invoice raised against one could not be
    // charged, and the catalogue keeps them only so old invoices still read.
    // Filtered here rather than at the fetch, so the set on the device is the
    // whole catalogue and a register that wants a retired fee still has it.
    //
    // And asked for rather than read, like the book catalogue above and for
    // the same reason: `status` is what this filter turns on, the office is
    // what changes it, and a fee offered off a stale copy is an invoice the
    // school will not accept.
    const items = await asked(SET.refFees, refFees)
    return items
      .filter((fee) => Number(fee.status) === 1)
      .map((fee) => ({ value: String(fee.id), label: fee.name }))
  }

  if (key === 'subjects') {
    // Withdrawn subjects are left out: a class cannot be taught one, and the
    // register keeps them only so old results still read. Filtered here for the
    // same reason as the fees above.
    const items = (await asked(SET.refSubjects, refSubjects)).filter(
      (subject) => Number(subject.status) === 1,
    )
    return items.map((subject) => ({
      value: String(subject.id),
      // Two schools' worth of "Mathematics" are told apart by the class that
      // owns the subject, so it is offered beside the name.
      label: subject.department ? `${subject.name} · ${subject.department}` : subject.name,
    }))
  }

  if (key === 'my-subjects') {
    // A teacher cannot read `/subjects` at all — it answers "restricted to
    // administrators" — and has no business filing a topic under a subject
    // that is not theirs, so the feed is the one the office gave them.
    //
    // Off the device, and the same set the subject register draws: a form
    // whose dropdown had to be fetched would be a form that cannot be filled
    // in without a connection, which is most of the point of filing a topic
    // from a classroom.
    const subjects = await held(teacherSubjects)
    return distinct(
      subjects.map((subject) => ({
        value: String(subject.id),
        label: subject.name,
        meta: subject.department?.name ?? '',
      })),
    )
  }

  if (key === 'my-classes') {
    /*
     * A teaching login can read no register of classes — `/departments`,
     * `/class-arms` and `/subjects` all answer "restricted to administrators" —
     * so the classes offered are the ones the teacher's own record names: the
     * class behind every subject they were given, and behind every arm they
     * take. A teacher given neither is offered nothing, which is the truth:
     * the office has not put them in front of a class yet. Both halves come
     * off the device's own sets, like every other feed here — this was the
     * one feed left asking the school, and offline it left the assignment
     * form's required class field with nothing to offer.
     *
     * `dependsOn` is a subject, where a field declares one, and narrows this
     * to the single class that sits it — see `myClasses`. Narrowed **on the
     * device**, like the arms feed: the class is already expanded on the
     * subject, so it costs no request and the dropdown still fills with no
     * connection.
     */
    const [subjects, arms] = await Promise.all([held(teacherSubjects), held(teacherArms)])
    return distinct(
      myClasses(subjects, arms, dependsOn).map(({ id, name, code }) => ({
        value: String(id),
        label: name,
        // This school has two classes both named SSS I; the code tells them
        // apart where it differs, and the id where even that is the same.
        meta: code === name ? '' : code,
      })),
    )
  }

  if (key === 'my-arms') {
    // The arms come back beside the roll rather than on it, and one student is
    // enough of the roll to read them off — which is what the collection asks
    // for. Off the device, like the subjects above.
    const class_arms = await held(teacherArms)
    return class_arms.map((arm) => ({
      value: String(arm.id),
      label: arm.department?.name ? `${arm.department.name} · ${arm.arm_name}` : arm.arm_name,
    }))
  }

  if (key === 'sessions' || key === 'terms') {
    /*
     * Newest first for sessions — a family asking about a year is nearly always
     * asking about this one or the last — which now has to be said rather than
     * taken from the endpoint's order: a collection is keyed and hands its rows
     * back in key order however they arrived.
     */
    const items =
      key === 'sessions'
        ? await asked(SET.refSessions, refSessions)
        : await asked(SET.refTerms, refTerms)
    return [...items]
      .sort((one, two) => (key === 'sessions' ? two.id - one.id : one.id - two.id))
      .map((record) => ({ value: String(record.id), label: record.name }))
  }

  if (key === 'roles') {
    const roles = await held(refRoles)
    return roles.map((role) => ({ value: String(role.id), label: role.role_name }))
  }

  if (key === 'countries' || key === 'states') {
    // Imported here so the world's states land in a chunk of their own,
    // fetched when a staff form is opened and not before.
    const { countryOptions, stateOptions } = await import('./countries')
    const { STATES_KNOWN_FOR } = await import('./country-ids')
    if (key === 'countries') return countryOptions()
    /*
     * A states field that names no country at all means Nigeria, because the
     * school can number no other country's states — see `country-ids.ts`.
     * The staff form's field is the one that names none, having stopped
     * asking which country; the student form still asks, and is untouched by
     * this. Note that it is untouched even before a country is picked: a
     * field declaring a `dependsOn` does not run this feed until that field
     * is filled (`enabled: !waiting` in `remote-select-field.tsx`), so an
     * empty `dependsOn` reaches here only from a field that never had one.
     */
    return stateOptions(dependsOn || STATES_KNOWN_FOR)
  }

  if (key === 'payment-methods') {
    // Named by the API rather than listed here, so a school that stops
    // taking cheques stops being offered cheque.
    return methodOptions((await heldDocument(refMethods)) ?? {})
  }

  if (key === 'teachers') {
    const items = await held(refTeachers)
    return distinct(
      items.map((teacher) => ({
        value: String(teacher.id),
        label:
          [teacher.firstname, teacher.lastname].filter(Boolean).join(' ').trim() ||
          `Teacher ${teacher.id}`,
        // Two members of staff really can share a name; the middle one is
        // what tells them apart before the id has to.
        meta: teacher.middlename?.trim() ?? '',
      })),
    )
  }

  return (await held(refGuardians)).map(guardianOption)
}

/**
 * A feed as a lookup from id to label, for a register that holds a foreign key
 * the list endpoint does not expand — a student's guardian, an arm's class. It
 * reads the same cache the forms' selects do, so asking for it costs a request
 * only when nothing has needed that feed for five minutes, and a feed that
 * fails leaves the column falling back rather than the page failing with it.
 */
export async function optionLabels(
  key: OptionsKey,
  dependsOn = '',
): Promise<ReadonlyMap<string, string>> {
  const options = await queryClient
    .query(optionsQuery(key, dependsOn))
    .catch(() => [])
  return new Map(options.map((option) => [option.value, option.label]))
}

/**
 * A searchable feed, asked with the term the office has typed so far. Guardians
 * run to the hundreds, so the whole list is never loaded — an empty term shows
 * the first page, and each keystroke (once settled) narrows it server-side.
 */
export function searchOptionsQuery(key: SearchKey, term: string) {
  return queryOptions({
    queryKey: ['search', key, term],
    queryFn: () => searchFeed(key, term),
    // A name searched once is likely searched again as the office corrects a
    // typo; a minute is long enough to spare the round trip, short enough that
    // a guardian added meanwhile still turns up.
    staleTime: 60_000,
    // As above, and doubly so here: this one asks the school first and falls
    // back to the device, and a paused query never reaches the fallback.
    networkMode: 'always',
  })
}

/** How many a search offers before the office is asked to type more. */
const FOUND = 20

/**
 * Whether what the office typed is in this option's text.
 *
 * The label is the whole of it on every searched feed: a student's is the name
 * and the admission number, a guardian's is both parents' names, a book's is
 * its title — which is what the office is typing, and what the school's own
 * search matches on. Only used offline, where the school cannot be asked.
 */
function matches(option: Option, needle: string): boolean {
  return !needle || option.label.toLowerCase().includes(needle)
}

/**
 * The searched feeds, asked of the school first and of the device when the
 * school cannot be reached.
 *
 * These are the one place a request is still the right answer: they exist for
 * registers too long to hold — every guardian, every admitted student — and the
 * endpoint searches the whole of one where this device holds at most the first
 * couple of hundred. So the school stays the authority.
 *
 * But a bursar at the counter with no signal is exactly who this app is for, so
 * a refusal falls back to searching what the device already keeps rather than
 * handing back nothing. That is narrower than the school's answer and honest
 * about it: the same set the unsearched feed offers, matched on the text.
 */
async function searchFeed(key: SearchKey, term: string): Promise<Option[]> {
  const needle = term.trim().toLowerCase()

  if (key === 'guardians') {
    return await parentsService
      .list({ q: term || undefined, limit: FOUND })
      .then((page) => page.items.map(guardianOption))
      .catch(async () =>
        (await held(refGuardians)).map(guardianOption).filter((one) => matches(one, needle)).slice(0, FOUND),
      )
  }

  if (key === 'students') {
    // The same register the `students` feed loads whole, narrowed server-side
    // by the name typed instead — for the flows where scrolling every admitted
    // student is worse than asking for the one being served.
    return await studentsService
      .list({ q: term || undefined, limit: FOUND, status: 'Admitted' })
      .then((page) => page.items.map(studentOption))
      .catch(async () =>
        (await held(refStudents)).map(studentOption).filter((one) => matches(one, needle)).slice(0, FOUND),
      )
  }

  if (key === 'books') {
    /*
     * `booktitle`, not `q`: the catalogue controller has its own three
     * parameters (`booktitle`, `bookauthor`, `isbn`) and no shared search.
     * Only the title is sent, because the title is what a librarian at the
     * counter has in front of them — the author is offered beside each result
     * to tell two editions apart, not typed to find one.
     *
     * What is offered is then narrowed by **stock**, not by the catalogue's
     * `isavailable` switch. See `onShelf`.
     *
     * An empty box asks for nothing. The other two searched feeds answer an
     * empty term with a first page, which is a cheap and useful thing to open
     * onto — but here it would mean the whole catalogue and then a stock
     * request for every title in it, sixteen on this school and one more per
     * title the library ever buys. The field says "Type a title to search"
     * instead, which is what it is for.
     */
    if (!needle) return []

    return await libraryService
      .books({ booktitle: term || undefined })
      .then(async (books) => distinct((await onShelf(books.slice(0, FOUND))).map(bookOption)))
      .catch(async () =>
        distinct(
          (await heldOnShelf())
            .map(bookOption)
            .filter((one) => matches(one, needle)),
        ).slice(0, FOUND),
      )
  }

  return []
}

/**
 * The titles with a copy actually on the shelf, asked of the school.
 *
 * `isavailable` used to decide this and no longer can: it is a switch the
 * office sets, and lending appears to flip it — both titles lent recently read
 * `Unavailable` while an older loan's title does not — so a set text with
 * thirty copies vanished from the counter the moment one went out. Stock is the
 * figure that answers the question actually being asked, and the library
 * computes it: `available` is `copies` minus what is out.
 *
 * One request per result, capped at `FOUND` and run together. That is the cost
 * of the only endpoint that knows, and it is paid on a field somebody is
 * typing into rather than on a page load.
 *
 * **A title whose stock cannot be read is offered, not hidden.** A dropped
 * request is not evidence a book is gone, and the lend endpoint refuses with
 * its own 409 where no copy is left — so the failure mode is a refusal the
 * librarian can read, rather than a book that silently is not in the list.
 *
 * What counts as "on the shelf" is `lendableCount`, which keeps the school's
 * reserve copy back. The rule lives with the other book readers so this half
 * and `heldOnShelf` below cannot answer differently — a picker that offered a
 * title online and hid it offline would be worse than either rule alone.
 */
async function onShelf<T extends { id: number }>(books: readonly T[]): Promise<T[]> {
  const stocks = await Promise.allSettled(books.map((book) => libraryService.stock(book.id)))
  return books.filter((_, index) => {
    const answer = stocks[index]
    if (answer?.status !== 'fulfilled') return true
    return lendableCount(answer.value?.available)
  })
}

/**
 * The same judgement with no school to ask, off the two sets the device holds.
 *
 * `copies` minus the loans not yet back is exactly what the stock endpoint
 * computes, and both halves are already here — so a bursar with no signal
 * still gets a list of what can go out rather than a list of what the office
 * last flipped a switch on. A title whose `copies` the catalogue does not say
 * is offered, for the same reason an unreadable stock answer is.
 */
async function heldOnShelf() {
  const [books, loans] = await Promise.all([
    held(refBooks),
    held(refLoans).catch(() => []),
  ])
  const out = new Map<string, number>()
  for (const loan of loans) {
    if (loanReturned(loan)) continue
    const id = loanBookId(loan)
    if (id) out.set(id, (out.get(id) ?? 0) + 1)
  }
  return books.filter((book) => {
    const copies = Number(book.copies)
    if (!Number.isFinite(copies)) return true
    // The same figure the stock endpoint computes, through the same rule —
    // `RESERVED_COPIES` is kept back here too, or the counter would offer a
    // last copy with no signal that it refuses with one.
    return lendableCount(copies - (out.get(String(book.id)) ?? 0))
  })
}

/**
 * One title as a picker offers it. Two copies of a set text can be two rows,
 * so the author is what tells the librarian which row is which before the id
 * has to.
 */
function bookOption(book: {
  id: number
  title: string
  author?: string | null
}): Option & { meta: string } {
  return { value: String(book.id), label: book.title, meta: book.author ?? '' }
}

/**
 * The label for an id the office picked out of a searched feed.
 *
 * A searched feed is never held whole, so the old way of naming a chosen
 * record — read the unsearched feed and look the id up — would load the very
 * list the search exists to avoid. What it reads instead is the answer the
 * office actually picked from: every search this field ran is in the query
 * cache under its own term, and the chosen row is in one of them by
 * construction. No request, and no list.
 *
 * Undefined where the cache has been swept since — a flow left open for an
 * hour, a reload between picking and confirming — and the caller says what to
 * put in its place rather than being handed a wrong name.
 */
export function searchedLabel(key: SearchKey, value: string): string | undefined {
  if (!value) return undefined
  for (const [, cached] of queryClient.getQueriesData<Option[]>({
    queryKey: ['search', key],
  })) {
    const found = cached?.find((option) => option.value === value)
    if (found) return found.label
  }
  return undefined
}

/**
 * One student as a select offers them. The admission number is what an office
 * bills and lends against, so it is offered beside the name rather than
 * instead of it.
 */
function studentOption(student: {
  id: number
  fname?: string | null
  mname?: string | null
  lname?: string | null
  regno?: string | null
}): Option {
  return {
    value: String(student.id),
    label:
      [
        [student.fname, student.mname, student.lname].filter(Boolean).join(' ').trim(),
        student.regno,
      ]
        .filter(Boolean)
        .join(' · ') || `Student ${student.id}`,
  }
}
