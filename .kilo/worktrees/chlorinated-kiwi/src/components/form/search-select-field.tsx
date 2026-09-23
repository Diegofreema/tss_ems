import { useQuery } from '@tanstack/react-query'
import { CheckIcon, SearchIcon } from 'lucide-react'
import { type KeyboardEvent, useEffect, useId, useState } from 'react'
import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { searchOptionsQuery } from '@/features/collections/option-feeds'
import type { SearchKey } from '@/features/collections/options'
import { useDebounced } from '@/hooks/use-debounced'
import { useUrlTerm } from '@/hooks/use-url-term'
import { cn } from '@/lib/utils'
import { FieldShell, type FieldSpan } from './field-shell'

/** The trigger wears the select's own clothes, so the two read as one control. */
const TRIGGER =
  'flex h-8 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-2.5 text-left text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20'

/**
 * What the box says for each feed — who is searched, how to ask, and what an
 * answer of nothing means. `prompt` is what stands in before anything has been
 * typed, which for the catalogue is the whole instruction rather than a hint:
 * that feed deliberately asks for nothing until it has a word to ask with.
 */
const WORDING: Record<
  SearchKey,
  { trigger: string; input: string; empty: string; prompt: string }
> = {
  guardians: {
    trigger: 'Search for a guardian',
    input: 'Father or mother’s name',
    empty: 'No guardian by that name.',
    prompt: 'Type a name to search.',
  },
  students: {
    trigger: 'Search for a student',
    input: 'Student’s name',
    empty: 'No student by that name.',
    prompt: 'Type a name to search.',
  },
  books: {
    trigger: 'Search for a book',
    input: 'Book title',
    // Not "no such title": the search found none the library can lend *now*,
    // which on a catalogue this size is usually a copy already out rather than
    // a book the school does not own.
    empty: 'No copy of that is on the shelf.',
    prompt: 'Type a title to search.',
  },
}

/**
 * A select whose feed is too long to open whole — every guardian or student in
 * the school.
 *
 * The office types a name instead of scrolling a list of hundreds; the box
 * waits for the typing to settle (`useDebounced`) and then asks the endpoint
 * with `q`, so a search costs one request rather than one per keystroke. The
 * value it submits is the record's id, the same as the ordinary select.
 *
 * Worked from the keyboard alone: the arrows walk the results and Enter takes
 * the highlighted one, so issuing a book to the student standing at the
 * counter is type-a-name-and-press-Enter rather than type, stop, reach for the
 * mouse, click. Enter is swallowed here whatever happens — it chooses a
 * student, and must never reach the form and submit it.
 *
 * On an edit the id is already set but its name is not in any loaded page, so
 * the label the record carried is shown until the office picks another.
 *
 * Where the typing is kept is the caller's to decide. By default it is this
 * component's own state, which is right for a field somebody fills in once;
 * `UrlSearchSelectField` below hands it the URL instead. Either way the box
 * shows every keystroke and only the settled term is asked for — the two
 * differ in where that settled term is written down, not in how long it waits.
 */
export type SearchSelectFieldProps<TValues extends FieldValues> = {
  name: Path<TValues>
  label: string
  from: SearchKey
  hint?: string
  required?: boolean
  span?: FieldSpan
  placeholder?: string
  /** The chosen record's name as the row already knew it, for an edit. */
  initialLabel?: string
}

/** The typing, where something other than this component is keeping it. */
type HeldTerm = {
  /** What has settled and is being asked for. */
  query: string
  /** What the box shows. */
  text: string
  setText: (text: string) => void
  clear: () => void
}

export function SearchSelectField<TValues extends FieldValues>({
  name,
  label,
  from,
  hint,
  required,
  span,
  placeholder,
  initialLabel,
  url,
}: SearchSelectFieldProps<TValues> & { url?: HeldTerm }) {
  const { control } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState(initialLabel ?? '')

  /*
   * Both are declared whatever the caller passed — the number of hooks a
   * render makes cannot depend on a prop — and the unused half simply sits
   * there holding an empty string, which costs one `useState` and one timer
   * that never fires.
   */
  const [ownTerm, setOwnTerm] = useState('')
  const ownSettled = useDebounced(ownTerm)
  const term = url ? url.text : ownTerm
  const setTerm = url ? url.setText : setOwnTerm
  const settled = url ? url.query : ownSettled

  // Asked for only while the popover is open, and re-asked as the settled term
  // changes under it — a closed field costs nothing.
  const { data, isPending, isError, isFetching } = useQuery({
    ...searchOptionsQuery(from, settled),
    enabled: open,
  })
  const results = data ?? []
  const loading = isPending || isFetching

  const wording = WORDING[from]

  /*
   * Which result the keyboard is on. The office is standing at a counter with
   * the student in front of them: they type a name and press Enter, and the
   * top match is the one they meant. Reaching for the mouse to click a row
   * that is already under the cursor of the keyboard is the step this saves.
   *
   * Held as a position rather than an id so it survives the list changing
   * under it — every keystroke replaces the results, and the highlight going
   * back to the top of the new list is right.
   */
  const [active, setActive] = useState(0)
  const listId = useId()
  const optionId = (index: number) => `${listId}-option-${index}`

  // Back to the top whenever a search answers, adjusted during the render that
  // brings the new results rather than in an effect after it — an effect would
  // paint the old highlight on the new list first, and on a list this short
  // that flicker is visible.
  const [shown, setShown] = useState(data)
  if (data !== shown) {
    setShown(data)
    setActive(0)
  }

  // Kept in view when the arrows walk past the bottom of the scroller. Read off
  // the document rather than a ref for each row: the list is rebuilt on every
  // search, and the ids are this field's own.
  useEffect(() => {
    if (!open) return
    document
      .getElementById(`${listId}-option-${active}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active, open, listId])

  const pick = (value: string, optionLabel: string) => {
    field.onChange(value)
    setChosen(optionLabel)
    setOpen(false)
    // Emptied rather than left behind: the trigger now names what was chosen,
    // and a term still in the address bar after the choosing would say the
    // office was looking for something it has already found. `clear` writes
    // that through at once rather than on the next tick of the timer.
    if (url) url.clear()
    else setOwnTerm('')
  }

  /*
   * Escape and the tab ring are the popover's own; these five are the keys it
   * has no opinion about. The arrows wrap, because a list of twenty is short
   * enough that going off the end and round is quicker than turning back.
   */
  const onKeys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Swallowed even with nothing to pick — the box is being typed into to
      // find a student, and an Enter that reached the form would file the
      // record with the field still empty.
      event.preventDefault()
      const one = results[active]
      if (one) pick(one.value, one.label)
      return
    }
    if (results.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(results.length - 1)
    }
  }

  return (
    <FieldShell
      name={name}
      label={label}
      hint={hint}
      error={error}
      required={required}
      span={span}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={name}
            aria-invalid={Boolean(error)}
            aria-haspopup="listbox"
            aria-expanded={open}
            onBlur={field.onBlur}
            className={cn(TRIGGER, !chosen && 'text-muted-foreground')}
          >
            <span className="line-clamp-1">
              {chosen || placeholder || wording.trigger}
            </span>
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) gap-0 p-0"
          align="start"
        >
          <div className="border-b border-divider p-2">
            <Input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={onKeys}
              placeholder={wording.input}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={results.length > 0 ? optionId(active) : undefined}
            />
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label={wording.trigger}
            className="max-h-64 overflow-y-auto p-1"
          >
            {loading ? (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">Searching…</p>
            ) : isError ? (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">
                That search could not run. Try again.
              </p>
            ) : results.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">
                {settled ? wording.empty : wording.prompt}
              </p>
            ) : (
              results.map((option, index) => {
                const picked = option.value === field.value
                return (
                  <button
                    key={option.value}
                    id={optionId(index)}
                    role="option"
                    aria-selected={picked}
                    // Never focused itself: focus stays in the search box so
                    // typing carries on, and the highlight is what moves.
                    tabIndex={-1}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pick(option.value, option.label)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.75 text-left text-sm transition-colors',
                      index === active && 'bg-neutral-100',
                      picked && 'font-medium',
                    )}
                  >
                    <span className="line-clamp-1">{option.label}</span>
                    {picked && <CheckIcon className="size-4 shrink-0 text-brand" />}
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </FieldShell>
  )
}

/**
 * The same field with its typing kept in the page's URL.
 *
 * For a search somebody is in the middle of rather than one they do once: the
 * term survives a reload, comes back with the back button, and travels in a
 * link — the lending form opened at `?q=achebe` opens with that search already
 * run. The route has to declare the key in its own `validateSearch` or the
 * router strips it, since nuqs writes through the router here.
 *
 * A separate component rather than a flag, because the hook that reads the URL
 * cannot be called conditionally and a field that does not want the URL must
 * not write to it. One key, one field: two fields on a form sharing a
 * parameter would type over each other.
 */
export function UrlSearchSelectField<TValues extends FieldValues>({
  param,
  ...props
}: SearchSelectFieldProps<TValues> & { param: string }) {
  const url = useUrlTerm(param)
  return <SearchSelectField<TValues> {...props} url={url} />
}
