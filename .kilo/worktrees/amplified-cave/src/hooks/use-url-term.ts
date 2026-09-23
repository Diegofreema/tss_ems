import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useEffect, useState } from 'react'

/** How long a search box waits after the last keystroke before asking. */
export const SETTLE_MS = 300

const asText = parseAsString.withDefault('')

/**
 * A search box whose settled term lives in the URL.
 *
 * Two values, and the difference between them is the whole point: `text` is
 * what the box shows and follows every keystroke, and the URL holds what has
 * actually been asked for. Typing moves the first at once and the second when
 * the typing stops, so a search costs one request rather than one per
 * keystroke — and because the debounced value is the one in the address bar,
 * the URL is never a half-typed word.
 *
 * Keeping it there rather than in component state is what makes a search
 * survive a reload and travel in a link: a register narrowed to one name, or a
 * lending form with the title already looked up, is the same page when it is
 * opened again. The route has to declare the key in its `validateSearch`, or
 * the router strips it back out — nuqs writes through the router here.
 *
 * The URL can also move on its own — the back button, or a link into a search —
 * and the box follows it, adjusting state during the render as React
 * documents rather than in an effect that would paint the stale term first.
 *
 * `onSettle` is for whatever else the new term invalidates. A register resets
 * to page 1 with it; it must be stable, since it is in the timer's own
 * dependencies.
 */
export function useUrlTerm(key: string, onSettle?: () => void) {
  const [query, setQuery] = useQueryState(key, asText)
  const [text, setText] = useState(query)
  const [settled, setSettled] = useState(query)

  if (query !== settled) {
    setSettled(query)
    setText(query)
  }

  useEffect(() => {
    if (text === query) return
    const timer = setTimeout(() => {
      // Null rather than an empty string: an emptied box takes the parameter
      // off the URL instead of leaving `?q=` behind it.
      void setQuery(text || null)
      onSettle?.()
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [text, query, setQuery, onSettle])

  /**
   * Emptied at once rather than after the timer. "Clear" is a button, not
   * typing: waiting 300ms to act on a press reads as a press that did nothing.
   */
  const clear = useCallback(() => {
    setText('')
    void setQuery(null)
  }, [setQuery])

  return { query, text, setText, clear }
}
