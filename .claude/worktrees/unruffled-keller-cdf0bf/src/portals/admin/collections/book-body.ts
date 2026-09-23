import type { BookBody } from '../../../api/library/types.ts'

/** The form's values, all strings from the inputs. */
export type FormValues = Record<string, unknown>

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function count(value: unknown): number | undefined {
  const held = text(value)
  const parsed = held === undefined ? Number.NaN : Number(held)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * The book form as `POST /admins/books` wants it, which is multipart — the
 * endpoint takes a cover image, so every value goes out as form data.
 *
 * Empty fields are dropped rather than sent blank: a catalogue where half the
 * titles have no call number is normal, and an edit that only changes the
 * count should not clear the section.
 *
 * The cover is one of those: it is sent only when a file has been picked, so
 * an edit that changes the shelf count leaves the existing cover alone rather
 * than blanking it. A file input cannot be filled from code, so a form opened
 * over a title that already has one still opens with nothing chosen.
 */
export function bookBody(values: FormValues): BookBody {
  const available = text(values.isavailable)
  return {
    title: text(values.title),
    author: text(values.author),
    isbn: text(values.isbn),
    section: text(values.section),
    pubdate: text(values.pubdate),
    copies: count(values.copies),
    callno: text(values.callno),
    department_id: count(values.department_id),
    isavailable: available === 'Unavailable' ? 'Unavailable' : 'Available',
    bookimage: values.bookimage instanceof File ? values.bookimage : undefined,
  }
}
