import type { ParentBody } from '../../../api/parents/types.ts'

/** The form's values, all strings from the inputs. */
export type FormValues = Record<string, unknown>

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * The guardian form as `POST /sparents` wants it. Every field is optional to
 * the API — a household may be a father, a mother or both — so empty ones are
 * dropped rather than sent blank, and editing one parent never clears the other.
 */
export function parentBody(values: FormValues): ParentBody {
  return {
    fathersname: text(values.fathersname),
    mothersname: text(values.mothersname),
    pemailaddress: text(values.pemailaddress),
    address: text(values.address),
    fatherphone: text(values.fatherphone),
    motherphone: text(values.motherphone),
    fathersjob: text(values.fathersjob),
    mothersjob: text(values.mothersjob),
  }
}
