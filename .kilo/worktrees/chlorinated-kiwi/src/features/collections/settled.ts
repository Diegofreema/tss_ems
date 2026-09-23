import type { FieldSpec } from './types.ts'

/**
 * Whether a field's answer arrived with the page, and what it is.
 *
 * A create form opened from beside another record has part of itself already
 * decided — a topic added from a subject's page is a topic in that subject —
 * and a dropdown offering every subject the teacher takes is asking a question
 * the reader answered by being there. Worse than redundant: the one wrong
 * answer in that list is the one a slipped click files the scheme of work
 * under, on a page where nothing afterwards says which subject it went to.
 *
 * So a settled field is *shown*, not asked. The value is still the form's and
 * still validated; it is the control that goes.
 *
 * Four things are deliberately left asked:
 *
 * - **An edit.** The record is what the form opens on, and a preset in the URL
 *   is not part of it.
 * - **A field with no feed.** An id needs a list to be named by; a preset in a
 *   text box is already legible, and there is nowhere to read "4" as a subject.
 * - **A set.** `multi` holds several ids, which is not one decision taken
 *   elsewhere.
 * - **A narrowed feed** (`dependsOn`). Its scope is a second field, and
 *   settling the narrow half alone leaves a question on screen about a field
 *   the reader can no longer see.
 */
export function settledValue(
  field: FieldSpec,
  preset: Record<string, string> | undefined,
  editing: boolean,
): string | undefined {
  if (editing || !field.optionsFrom || field.multi || field.dependsOn) return undefined
  const value = preset?.[field.key]?.trim()
  return value ? value : undefined
}
