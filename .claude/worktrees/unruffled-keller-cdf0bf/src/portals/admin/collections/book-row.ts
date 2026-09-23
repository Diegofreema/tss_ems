import type { Book } from '../../../api/library/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'

function text(value: string | number | null | undefined): string {
  const word = typeof value === 'number' ? String(value) : value?.trim()
  return word || BLANK
}

/** An id a select submits, or nothing — never the blank dash. */
function id(value: number | null | undefined): string {
  return value ? String(value) : ''
}

/**
 * A title as the catalogue reads it, keyed as the endpoint is so the edit form
 * prefills straight off the row. The form maps the blank dash back to an empty
 * field, so a title with no ISBN on record reads "—" in the table and opens
 * empty in the form.
 *
 * There is no column for copies on loan: what is out is answered for the
 * library as a whole and never per title, and a number nobody counted is worse
 * than none. `isavailable` is the API's own word, shown as it comes.
 */
export function bookRow(book: Book): Row {
  return {
    id: String(book.id),
    title: text(book.title),
    author: text(book.author),
    isbn: text(book.isbn),
    copies: text(book.copies),
    section: text(book.section),
    isavailable: text(book.isavailable),

    // Read by the record panel rather than the table.
    callno: text(book.callno),
    // Free text on the API, and the school uses it both ways — three titles
    // carry a bare year and one a full date. Shown as written rather than
    // parsed into a date it may not be.
    pubdate: text(book.pubdate),
    added: book.date_created?.slice(0, 10) ?? BLANK,

    // Prefills the class select, which wants the school's own id.
    department_id: id(book.department_id),
  }
}
