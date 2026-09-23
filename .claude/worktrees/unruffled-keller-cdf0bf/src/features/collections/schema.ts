import { z, type ZodType } from 'zod'
import type { FieldSpec, FormSectionSpec } from './types.ts'

/** The design accepts digits, separators and spaces in a numeric field. */
const NUMERIC = /^[0-9,.\s]+$/

function schemaForField(field: FieldSpec): ZodType {
  if (field.multi) {
    const many = z.array(z.string())
    return field.required ? many.min(1, 'Pick at least one') : many
  }

  if (field.file) {
    // The browser will not let a file input be filled from code, so an edit
    // form opens with nothing chosen even where the record has a cover.
    // Requiring one here would refuse every edit that did not re-pick it.
    return z.instanceof(File).optional()
  }

  if (field.date) {
    return field.required
      ? z.date({ message: 'Required' })
      : z.date().optional()
  }

  let text = z.string().trim()
  if (field.required) text = text.min(1, 'Required')

  if (field.time) {
    // The control cannot produce anything else, so this catches a value typed
    // into a browser that fell back to a plain box rather than the reader.
    const clock = text.refine(
      (value) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
      'A time of day, as 09:00',
    )
    return field.required ? clock : clock.optional()
  }

  if (field.number) {
    const bounded = text.refine((value) => {
      if (!value) return true
      if (!/^\d+$/.test(value)) return false
      const figure = Number(value)
      return (
        (field.min === undefined || figure >= field.min) &&
        (field.max === undefined || figure <= field.max)
      )
    }, numberMessage(field))
    return field.required ? bounded : bounded.optional()
  }

  let schema: ZodType = text
  if (field.email) {
    schema = text.refine(
      (value) => !value || z.email().safeParse(value).success,
      'That does not look like an email address',
    )
  } else if (field.numeric || field.money) {
    schema = text.refine(
      (value) => !value || NUMERIC.test(value),
      'Numbers only',
    )
  }

  return field.required ? schema : schema.optional()
}

/** What a figure outside its bounds is told, in the words of the bound itself. */
function numberMessage(field: FieldSpec): string {
  if (field.min !== undefined && field.max !== undefined)
    return `A whole number between ${field.min} and ${field.max}`
  if (field.max !== undefined) return `A whole number, at most ${field.max}`
  if (field.min !== undefined) return `A whole number, at least ${field.min}`
  return 'A whole number'
}

/** Builds one validator for a whole form definition. */
export function schemaFromSections(sections: FormSectionSpec[]) {
  const shape: Record<string, ZodType> = {}
  for (const section of sections) {
    for (const field of section.fields) {
      shape[field.key] = schemaForField(field)
    }
  }
  return z.object(shape)
}
