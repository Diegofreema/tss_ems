import { queryOptions, useQuery } from '@tanstack/react-query'
import { resultsService } from '@/api/results/service'
import { queryClient } from '@/lib/query-client'
import { termFromResults, type MarkingTerm, type TermBearing } from './term'

/**
 * The school's own results register, asked only for the term it names.
 *
 * One query definition shared by the hook and the plain function below, so the
 * score sheet and the upload form cannot disagree about which term they file
 * into — and so that asking twice costs one request.
 */
const schoolTerm = () =>
  queryOptions({
    queryKey: ['teaching', 'marking-term'],
    queryFn: () => resultsService.list({ limit: TO_READ }),
    // The term changes when the school moves into the next one, not while
    // somebody is marking a sheet.
    staleTime: 10 * 60_000,
    // Deliberately `always`: with no connection this must fail rather than
    // pause. A paused query never settles, and the sheet would sit for ever
    // with a button that never explained itself.
    networkMode: 'always',
    retry: false,
  })

/**
 * The same answer, outside React.
 *
 * The upload form's `save` runs off a collection definition rather than a
 * component, and it needs the term for the same reason the score sheet does.
 * Through `queryClient.query` rather than `ensureQueryData`, as CLAUDE.md
 * requires: the second hands back whatever is cached however stale.
 *
 * A refusal is not thrown on — the caller turns a missing term into the
 * sentence that says what to do about it.
 */
export async function resolveMarkingTerm(
  own: readonly TermBearing[],
): Promise<MarkingTerm | undefined> {
  const fromOwn = termFromResults(own)
  if (fromOwn) return fromOwn
  const page = await queryClient.query(schoolTerm()).catch(() => undefined)
  return termFromResults(page?.items ?? [])
}

/**
 * Which term this teacher's marks are filed into.
 *
 * A teaching login cannot read the school calendar — `/sessions`, `/semesters`
 * and `/settings` all answer "restricted to administrators" — so the term has
 * to be read off a mark. The teacher's own are already on the device and are
 * the first answer, which costs nothing and works with no signal at all.
 *
 * A teacher who has never filed a mark had no second answer, and that was the
 * bug: the score sheet's Save button was disabled for them for ever, because
 * the endpoint wants a session and a term and the portal could not name
 * either. Every teacher is in that position on their first day, which made
 * "enter your first mark" the one thing this page could not do.
 *
 * So where their own marks say nothing, the school's own results register is
 * asked — `/results` is open to any staff login, and one page of it names the
 * term the school is currently filing into. It is a fallback in the strict
 * sense: it never runs while the device already knows the answer.
 *
 * Deliberately on the query path, and this is the justification CLAUDE.md asks
 * for. It is not a set: it is one question, asked once, whose answer is four
 * fields off somebody else's row — and it is asked only in the one case where
 * the device genuinely cannot answer it. `networkMode: 'always'` so that with
 * no connection it fails rather than pausing: a paused query never settles,
 * and the sheet would sit for ever with a button that never explained itself.
 */
export function useMarkingTerm(own: readonly TermBearing[]): {
  term: MarkingTerm | undefined
  /** The fallback is still in flight; the button waits rather than refusing. */
  looking: boolean
} {
  const fromOwn = termFromResults(own)

  const school = useQuery({ ...schoolTerm(), enabled: fromOwn === undefined })

  return {
    term: fromOwn ?? termFromResults(school.data?.items ?? []),
    looking: fromOwn === undefined && school.isFetching,
  }
}

/**
 * How much of the register to read.
 *
 * More than one, because the newest mark is picked by its own stamp rather
 * than trusted to be first — this endpoint has never been read with anything
 * on it, so its ordering is not something to bet a teacher's marks on. Few
 * enough that it stays one small request.
 */
const TO_READ = 20
