import type { Parent } from '../../api/parents/types.ts'
import type { Option } from './options.ts'

/**
 * A household as the guardian select offers it.
 *
 * The pupil form links to a household by id and asks for nothing else: the
 * email, the phone and the address are already on the guardian record, and a
 * second copy typed onto the pupil is just a second thing to keep in step.
 */
export function guardianOption(parent: Parent): Option {
  const name = [parent.fathersname, parent.mothersname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' & ')

  return {
    value: String(parent.id),
    // A household with neither parent named is still one a pupil belongs to,
    // so it stays pickable by whatever it can be recognised by.
    label: name || parent.pemailaddress?.trim() || `Guardian ${parent.id}`,
  }
}
