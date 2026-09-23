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

  if (field.datetime) {
    // As with `time`, this catches a value typed into a browser that fell back
    // to a plain box rather than the picker. The ordering rule between two of
    // these is a whole-form check — see `schemaFromSections`.
    const stamp = text.refine(
      (value) => !value || /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value),
      'A date and a time',
    )
    return field.required ? stamp : stamp.optional()
  }

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
  } else if (field.emailOrUsername) {
    // The `@` is what makes this decidable. Nobody types one into a username,
    // so a value carrying one is an address being attempted and is held to
    // being a whole one; a value without one is whatever the school issued and
    // is nobody's business to check.
    schema = text.refine(
      (value) => !value || !value.includes('@') || z.email().safeParse(value).success,
      'That looks like an email address, but it is not a complete one',
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

/**
 * Builds one validator for a whole form definition.
 *
 * `after` is checked here rather than on the field, because a rule about two
 * fields cannot be written on one of them: a refinement on the closing time
 * has no way to read the opening time beside it.
 */
export function schemaFromSections(sections: FormSectionSpec[]) {
  const shape: Record<string, ZodType> = {}
  const ordered: { field: string; after: string; label: string }[] = []

  for (const section of sections) {
    for (const field of section.fields) {
      shape[field.key] = schemaForField(field)
      if (field.after) {
        const earlier = sections
          .flatMap((one) => one.fields)
          .find((one) => one.key === field.after)
        // Named from the other field's own label, so the message reads in the
        // form's words rather than in a key: "must be after Opens".
        ordered.push({ field: field.key, after: field.after, label: earlier?.label ?? field.after })
      }
    }
  }

  const object = z.object(shape)
  if (ordered.length === 0) return object

  return object.superRefine((values, context) => {
    for (const rule of ordered) {
      const later = String((values as Record<string, unknown>)[rule.field] ?? '').trim()
      const earlier = String((values as Record<string, unknown>)[rule.after] ?? '').trim()
      // Either side left blank is an open-ended window, which is allowed —
      // there is nothing to be out of order with.
      if (!later || !earlier) continue
      // Compared as strings: both are `YYYY-MM-DDTHH:MM`, a format that sorts
      // the same way it reads, so no clock and no timezone come into it.
      if (later <= earlier) {
        context.addIssue({
          code: 'custom',
          path: [rule.field],
          message: `Must be after ${rule.label.toLowerCase()}`,
        })
      }
    }
  })
}
