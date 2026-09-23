/**
 * What a rich-text field actually says, with its markup taken off.
 *
 * The editor stores HTML, and two things need the words alone. The search box
 * over a list is one: every row's cells are matched against what was typed,
 * and a topic whose body is markup would answer to "p", "strong" and "class"
 * as readily as to anything the teacher wrote. The other is whether a required
 * field was filled in at all — an editor the teacher emptied still holds
 * `<p></p>`, which is a non-empty string and would pass every check on one.
 *
 * A tag becomes a space rather than nothing, so two paragraphs do not run into
 * one word. The cost is that a half-emboldened word is two words to the search
 * box, which is a better failure than "onetwo" matching neither.
 */
const TAG = /<[^>]*>/g

/** The few the editor writes. Anything else is left as it was sent. */
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  nbsp: ' ',
}

export function plainText(html: string): string {
  return html
    .replace(TAG, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Whether a stored value carries markup at all.
 *
 * The same field holds both: an assignment set before the editor existed is
 * the teacher's plain sentence, and one set since is HTML. A reader that
 * assumes the second shows tags to a student, and one that assumes the first
 * throws the formatting away, so which it is has to be asked.
 */
export function isRichText(value: string): boolean {
  return /<[a-z][^>]*>/i.test(value)
}

/** Whether anything was written, rather than whether anything was stored. */
export function hasText(html: string): boolean {
  return plainText(html).length > 0
}
