import type { Parent } from '../../api/parents/types.ts'
import type { Option } from './options.ts'

/**
 * A household as the guardian select offers it.
 *
 * The student form links to a household by id and asks for nothing else: the
 * email, the phone and the address are already on the guardian record, and a
 * second copy typed onto the student is just a second thing to keep in step.
 */
/**
 * A household as one line. The API keeps a father and a mother on the same
 * record rather than a person per row, so the name is both of them where the
 * school holds both.
 *
 * Shared rather than kept beside the office register: the guardian's own
 * account page reads the same record, and the portals do not import from each
 * other.
 */
export function parentName(
  parent: Pick<Parent, 'fathersname' | 'mothersname'>,
): string {
  return [parent.fathersname, parent.mothersname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' & ')
}

export function guardianOption(parent: Parent): Option {
  const name = parentName(parent)

  return {
    value: String(parent.id),
    // A household with neither parent named is still one a student belongs to,
    // so it stays pickable by whatever it can be recognised by.
    label: name || parent.pemailaddress?.trim() || `Guardian ${parent.id}`,
  }
}
