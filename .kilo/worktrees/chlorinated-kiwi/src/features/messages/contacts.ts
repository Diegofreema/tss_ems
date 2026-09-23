import type { Contact } from '../../api/conversations/types.ts'

/**
 * Who the composer offers, and how it tells two of them apart.
 *
 * The school's own register holds the same teacher under several logins — the
 * live contacts answer carried one name five times, under five `user_id`s —
 * and a message goes to a login, not to a person. Folding them together would
 * be picking one on the reader's behalf and hoping; dropping the duplicates
 * would hide the one the reader may actually need.
 *
 * So every login is offered, and the ones that would otherwise read as the
 * same entry are labelled with the id that distinguishes them. It is not
 * pretty, and it is the truth about this school's data.
 */
export type ContactOption = {
  userId: number
  name: string
  role: string
  /** How the server said they are reachable. Null on most rows. */
  why: string | null
  /** Only where another contact shares this exact name and role. */
  ambiguous: boolean
}

/** A contact's display name, with the login id only where it is needed. */
export function contactLabel(option: ContactOption): string {
  return option.ambiguous ? `${option.name} · login ${option.userId}` : option.name
}

/**
 * The contacts as a picker shows them: by name, then by role, then by id, so
 * the order is the same on every render and two logins of one name sit
 * together where the reader can see the choice they are being asked to make.
 */
export function contactOptions(contacts: readonly Contact[]): ContactOption[] {
  const seen = new Map<string, number>()
  for (const contact of contacts) {
    const key = identity(contact)
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }

  return [...contacts]
    .map((contact) => ({
      userId: contact.user_id,
      name: (contact.name ?? '').trim() || 'Unnamed account',
      role: contact.role ?? '',
      why: contact.why?.trim() || null,
      ambiguous: (seen.get(identity(contact)) ?? 0) > 1,
    }))
    .sort(
      (one, two) =>
        one.name.localeCompare(two.name) ||
        one.role.localeCompare(two.role) ||
        one.userId - two.userId,
    )
}

/** Name and role together — two people of one name in two roles are two entries. */
function identity(contact: Contact): string {
  return `${(contact.name ?? '').trim().toLowerCase()}|${contact.role ?? ''}`
}

/**
 * Filters the picker as somebody types.
 *
 * Words are matched separately and in any order, the way the school's own
 * search does it, so "ayogu ikechukwu" finds "Dr. IKECHUKWU AYOGU". The role
 * is searched too — typing "teacher" narrows to the staff room.
 */
export function matchesContact(option: ContactOption, term: string): boolean {
  const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = `${option.name} ${option.role} ${option.why ?? ''}`.toLowerCase()
  return words.every((word) => haystack.includes(word))
}

/** The roles present, in the order a picker groups them under. */
export function contactRoles(options: readonly ContactOption[]): string[] {
  const roles: string[] = []
  for (const option of options) {
    const role = option.role || 'Other'
    if (!roles.includes(role)) roles.push(role)
  }
  return roles.sort((one, two) => one.localeCompare(two))
}
