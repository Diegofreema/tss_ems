import type { ApiEnvelope } from './types.ts'

/** Where an envelope can begin: `{"success":` with any spacing the encoder chose. */
const ENVELOPE_START = /\{\s*"success"\s*:/g

/**
 * The envelope out of an answer's text, or `null` when there is none.
 *
 * Normally the text is the envelope. But the school's server prints PHP
 * warnings into the page it is building, **ahead of** the JSON — CakePHP's
 * deprecation notices for `allowEmpty()` and `notEmpty()` in
 * `StudentsTable::validationDefault`, a 58 KB `<div class="cake-error">` in
 * front of `{"success":true,…}` on every student create and edit. Measured
 * 2026-09-24: `POST /students` answered 200 and saved the student, and
 * `response.json()` threw on the first `<`, so the app read a school that had
 * said yes as a school that had said nothing — held the enrolment, sent it
 * again, and was refused 409 because the first one had landed. Only the email's
 * uniqueness stopped that being a second copy of the child.
 *
 * So a text that is not JSON is searched for an envelope that runs to its end.
 * A candidate inside the warning is not one: the parse of it takes in the HTML
 * after it and fails, so only the real answer — which is always last — parses.
 */
export function readEnvelope<TData>(text: string): ApiEnvelope<TData> | null {
  const whole = parse<TData>(text)
  if (whole) return whole
  for (const match of text.matchAll(ENVELOPE_START)) {
    const found = parse<TData>(text.slice(match.index))
    if (found) return found
  }
  return null
}

function parse<TData>(text: string): ApiEnvelope<TData> | null {
  try {
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' && 'success' in value
      ? (value as ApiEnvelope<TData>)
      : null
  } catch {
    return null
  }
}
