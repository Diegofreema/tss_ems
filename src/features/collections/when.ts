import { BLANK } from './blank.ts'
import { formatDate } from '../../lib/format.ts'

/**
 * A timestamp as the screens show it — the day alone, or the day with the
 * time on it.
 *
 * This API writes dates three ways: an ISO timestamp carrying the school's own
 * offset (`2026-08-27T09:23:47+01:00`), a bare one with no zone at all
 * (`payday`, `2026-08-27 09:23:47`), and `24 Oct 2022 19:02 pm` on rows raised
 * years ago. The third is already readable, so a date that will not parse is
 * shown as it was sent rather than as "Invalid Date".
 *
 * A bare timestamp is read as the reader's own clock, because it carries the
 * same wall clock as the ISO ones beside it — `receipt.issued_at` is
 * `09:23:47+01:00` against a `payday` of `09:23:47`. Both are the school's
 * time, and reading either as UTC would put the same payment an hour out from
 * itself.
 */
export function when(value: string | null | undefined, withTime = false): string {
  if (!value) return BLANK
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return value
  if (!withTime) return formatDate(at)
  return at.toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * A timestamp read as the school's own clock.
 *
 * The same wall clock reaches the portal stamped three ways — `+01:00` on most
 * endpoints, `+00:00` on the household's invoices, and with no zone at all on
 * an assignment's closing time. It is the school's time in every case, so the
 * offset is dropped rather than believed: taken at face value it would move an
 * invoice raised in the last hour of a day onto the next one, and shut an assignment
 * an hour early.
 */
export function schoolTime(stamp: string | null | undefined): string | null | undefined {
  return stamp?.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, '') ?? stamp
}

/**
 * The same stamp as milliseconds, or null where it will not parse.
 *
 * Everything that compares two of these — is the assignment still open, was this
 * filed today — needs a number rather than a string, and needs the school's
 * clock rather than the reader's guess at it.
 */
export function schoolMillis(stamp: string | null | undefined): number | null {
  if (!stamp) return null
  const parsed = new Date(schoolTime(stamp) ?? '').getTime()
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * A school stamp as the `datetime-local` control holds it: `YYYY-MM-DDTHH:MM`.
 *
 * Parsed with a pattern rather than through `Date`, for the same reason
 * `toApiDate` is written off the calendar's own parts: a stamp read into a
 * `Date` and written back out is a stamp that has been through the reader's
 * timezone twice, and an assignment closing at 08:00 in Lagos would open the
 * form at 07:00 for anybody marking from London. The school's wall clock is
 * the only thing the school and the reader agree on, so it is moved as text.
 *
 * Seconds are dropped because the control has none. That is a real loss — a
 * window read back and saved unchanged moves its closing time by up to 59
 * seconds — and it is the right trade: a teacher setting the minute an
 * assignment shuts is not thinking in seconds, and offering a seconds box
 * would suggest they should be.
 */
export function toDateTimeInput(stamp: string | null | undefined): string {
  const bare = schoolTime(stamp)?.trim()
  if (!bare) return ''

  const iso = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(bare)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}:${iso[5]}`

  return fromDisplayStamp(bare)
}

/**
 * The third spelling: `9/17/26, 10:14 AM`.
 *
 * Read off the wire 2026-09-16, and it is the *same field* as the raw
 * `2026-09-23 08:12:00` beside it — the school returns `closedate` exactly as
 * it was sent and hands `opendate` back through a US-locale formatter. Two
 * ends of one window, two formats, on one row.
 *
 * This is precisely the hazard CLAUDE.md records about readers written from a
 * contract, and it failed the same silent way: the strict pattern above found
 * nothing, the edit form opened with an empty box, and saving from that box
 * would have sent null and wiped an opening date the teacher had set. A blank
 * that destroys data is worse than an error, so the format is read rather
 * than ignored.
 *
 * Parsed with a pattern rather than by handing the string to `Date`, whose
 * behaviour outside ISO is implementation-defined — the same reason nothing
 * else here parses a stamp by trusting the engine.
 *
 * Exported because it is not one field's problem: `opendate` was the first,
 * and `GET /students/me/content` sends a topic's `posted` in exactly the same
 * dialect. A second reader written against the same shape is a second reader
 * to get subtly wrong.
 *
 * **Month before day**, because that is what produced it: `9/17/26` can only
 * be the 17th of September, so the formatter is American. A date where both
 * parts are 12 or under — `5/6/26` — is genuinely ambiguous in isolation, and
 * is read the way the formatter that wrote it would have written it. The real
 * fix is server-side: a field should come back in the shape it was sent.
 */
export function fromDisplayStamp(bare: string): string {
  const parts =
    /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp])\.?[Mm]\.?$/.exec(
      bare,
    )
  if (!parts) return ''

  const [, month, day, year, hour, minute, meridiem] = parts
  const pad = (value: string | number) => String(value).padStart(2, '0')
  // A two-digit year is this century: the school issues no assignment for 1926.
  const full = year.length === 2 ? 2000 + Number(year) : Number(year)

  // 12 AM is midnight and 12 PM is noon — the one pair that does not simply
  // add twelve, and the one that silently moves a window half a day.
  const raw = Number(hour) % 12
  const hours = meridiem.toLowerCase() === 'p' ? raw + 12 : raw

  return `${full}-${pad(month)}-${pad(day)}T${pad(hours)}:${minute}`
}

/**
 * The control's value as the school stores it: `YYYY-MM-DD HH:MM:SS`.
 *
 * That is the shape `GET /setassignments` sends back — `2026-09-23 08:12:16`,
 * a space and no zone — so it is the shape written to it, and a window saved
 * and reloaded reads the same both ways.
 *
 * No zone is sent, deliberately. The API keeps the wall clock it is given and
 * discards any offset on it, which `startedAt` in the student's own submit
 * already records; sending the reader's UTC would shut an assignment an hour
 * early for anybody outside Lagos.
 *
 * Null for an empty box, which is the school's own "no bound" — every
 * assignment on file today carries `opendate: null`.
 */
export function toSchoolStamp(input: string | null | undefined): string | null {
  const typed = input?.trim()
  if (!typed) return null
  const parts = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/.exec(typed)
  return parts ? `${parts[1]} ${parts[2]}:${parts[3] ?? '00'}` : null
}
