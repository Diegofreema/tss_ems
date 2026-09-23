import { BLANK } from './blank.ts'

/**
 * Reading a shape nobody has seen filled in.
 *
 * Several of this API's endpoints answer with an empty list on every account
 * that can reach them, so the spelling of a row is known only from the write
 * contract beside it — or not at all. Rather than pin one key and draw nothing
 * for ever if it turns out to be another, these read a record for the first
 * key that actually carries something, and the candidate list is the guess:
 * one place per shape, under test, retired by a single live answer.
 *
 * Only for shapes that really are unverified. A field the API has been seen to
 * send is read by its name.
 */

type Loose = Record<string, unknown>

/** The first of these keys the record actually carries. */
export function pick(record: Loose | undefined, ...keys: string[]): unknown {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

/**
 * A value as a cell reads it. An expanded row — `{id, name}` where a bare id
 * might have been — is read for its name, which is what the endpoints that
 * expand anything at all send.
 */
export function looseText(value: unknown): string {
  if (typeof value === 'string') return value.trim() || BLANK
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'name' in value) {
    return looseText((value as { name: unknown }).name)
  }
  return BLANK
}

/** A figure, or nothing where the value is not one. */
export function looseNumber(value: unknown): number | undefined {
  const parsed = Number(
    value && typeof value === 'object' && 'id' in value
      ? (value as { id: unknown }).id
      : value,
  )
  return Number.isFinite(parsed) ? parsed : undefined
}

/** An id: a positive number, whether it arrived bare or on an expanded row. */
export function looseId(value: unknown): number | undefined {
  const parsed = looseNumber(value)
  return parsed !== undefined && parsed > 0 ? parsed : undefined
}
