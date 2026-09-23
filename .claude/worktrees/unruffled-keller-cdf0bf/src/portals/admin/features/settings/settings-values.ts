import type { SchoolSettings, SettingsBody } from '../../../../api/settings/types.ts'

/**
 * The settings form's values.
 *
 * The API reads and writes this row under two different sets of names —
 * `prefixes.regno_format` comes back nested and goes out flat as
 * `regnoformat`, and the two term dates are `calendar.current_term_ends` on
 * the way in and `currenttermends` on the way out. The form is keyed as the
 * body is, and this file is the only place that knows both spellings.
 */
export type SettingsValues = {
  name: string
  phone: string
  email: string
  address: string
  rector: string
  rectorcerts: string
  registrar: string
  registrarcerts: string
  regnoformat: string
  application_no_prefix: string
  /** Absent where the school has not set one; the picker holds a real Date. */
  currenttermends?: Date
  nexttermbegins?: Date
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * A date as the API stores it: DD/MM/YYYY. Read as three numbers rather than
 * handed to `new Date`, which would read 05/06/2026 as the fifth of June in
 * one browser and the sixth of May in another.
 */
export function fromStoredDate(stored: string | undefined): Date | undefined {
  const parts = stored?.trim().split('/')
  if (parts?.length !== 3) return undefined
  const [day, month, year] = parts.map(Number)
  if (!day || !month || !year) return undefined
  const date = new Date(year, month - 1, day)
  // A date the calendar had to roll forward — 31/02 — was never a real day.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : undefined
}

/**
 * Back out as YYYY-MM-DD, which the endpoint also accepts and which cannot be
 * read the wrong way round. Built from the local parts rather than
 * `toISOString`, which would send the day before for any school east of UTC.
 */
export function toStoredDate(date: Date | undefined): string | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The one settings row as the form holds it. */
export function settingsValues(settings: SchoolSettings | undefined): SettingsValues {
  const prefixes = settings?.prefixes ?? {}
  const calendar = settings?.calendar ?? {}
  return {
    name: text(settings?.name),
    phone: text(settings?.phone),
    email: text(settings?.email),
    address: text(settings?.address),
    rector: text(settings?.rector),
    rectorcerts: text(settings?.rectorcerts),
    registrar: text(settings?.registrar),
    registrarcerts: text(settings?.registrarcerts),
    regnoformat: text(prefixes.regno_format),
    application_no_prefix: text(prefixes.application_no),
    currenttermends: fromStoredDate(calendar.current_term_ends),
    nexttermbegins: fromStoredDate(calendar.next_term_begins),
  }
}

/**
 * The form as `POST /settings` wants it.
 *
 * Every text field is sent, empty included, so clearing one clears it. A date
 * is the exception: it is only sent when there is one, because the form has no
 * way to say "no end of term" — an empty date box is a date not picked yet,
 * and blanking the school's term end by opening the page would be worse than
 * leaving it alone.
 */
export function settingsBody(values: SettingsValues): SettingsBody {
  const body: SettingsBody = {
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    address: values.address.trim(),
    rector: values.rector.trim(),
    rectorcerts: values.rectorcerts.trim(),
    registrar: values.registrar.trim(),
    registrarcerts: values.registrarcerts.trim(),
    regnoformat: values.regnoformat.trim(),
    application_no_prefix: values.application_no_prefix.trim(),
  }

  const ends = toStoredDate(values.currenttermends)
  if (ends) body.currenttermends = ends
  const begins = toStoredDate(values.nexttermbegins)
  if (begins) body.nexttermbegins = begins

  return body
}

/**
 * Whether the next term starts before the one running ends. The API takes both
 * dates without comparing them, and a school that types them the wrong way
 * round gets a report that reads as if the term is already over.
 */
export function datesOutOfOrder(
  ends: Date | undefined,
  begins: Date | undefined,
): boolean {
  return Boolean(ends && begins && begins.getTime() < ends.getTime())
}
