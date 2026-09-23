import type { Child, Parent } from '../../../api/parents/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** Joins the parts a record actually carries, e.g. "Teacher · 0803 441 2280". */
function joined(...parts: (string | null | undefined)[]): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' · ') || BLANK
}

/**
 * A household as one line. The API keeps a father and a mother on the same
 * record rather than a person per row, so the name is both of them where the
 * school holds both.
 */
export function parentName(parent: Pick<Parent, 'fathersname' | 'mothersname'>): string {
  return [parent.fathersname, parent.mothersname]
    .map((name) => name?.trim())
    .filter(Boolean)
    .join(' & ')
}

/** The API spells its two statuses in lower case; the register does not. */
export function parentStatus(status: string | null | undefined): string {
  const word = status?.trim()
  return word ? word[0].toUpperCase() + word.slice(1) : BLANK
}

/**
 * A guardian, as the register and their own record read them.
 *
 * `owing` stays blank: the list endpoint does not answer for it, and a
 * household's balance is the sum of its children's invoices, which would cost
 * a request a row. `children` is counted only where the detail expanded them —
 * the register is told nothing about them, and blank says that.
 */
export function parentRow(parent: Parent): Row {
  const name = parentName(parent)
  return {
    id: String(parent.id),
    name: name || text(parent.pemailaddress),
    phone: text(parent.fatherphone ?? parent.motherphone),
    email: text(parent.pemailaddress),
    status: parentStatus(parent.status),

    // Read by the record panel rather than the table.
    father: joined(parent.fathersname, parent.fatherphone, parent.fathersjob),
    mother: joined(parent.mothersname, parent.motherphone, parent.mothersjob),
    address: text(parent.address),
    username: text(parent.username),
    children: parent.children ? String(parent.children.length) : BLANK,

    // The edit form is keyed as the endpoint is, and prefills from here.
    fathersname: parent.fathersname ?? '',
    mothersname: parent.mothersname ?? '',
    pemailaddress: parent.pemailaddress ?? '',
    fatherphone: parent.fatherphone ?? '',
    motherphone: parent.motherphone ?? '',
    fathersjob: parent.fathersjob ?? '',
    mothersjob: parent.mothersjob ?? '',
  }
}

/** One line of a guardian's children tab, from `GET /sparents/{id}/children`. */
export function childRow(child: Child): Row {
  return {
    id: String(child.id),
    name: text([child.fname, child.mname, child.lname].filter(Boolean).join(' ')),
    adm: text(child.regno),
    class: text(child.department),
    arm: text(child.class_arm),
    status: text(child.studentstatus),
  }
}

/**
 * What deleting a household would strand. The API refuses outright while a
 * pupil still points at it, so this is the sentence that explains the refusal
 * before the button rather than after it.
 */
export function parentDeleteBody(row: Row | undefined): string {
  const count = Number(row?.children)
  const name = row?.name && row.name !== BLANK ? row.name : 'This household'
  // The register is told nothing about children, so a row that came from the
  // list cannot promise either sentence. Saying "permanently" over a household
  // that has four pupils would be reassuring and wrong.
  if (!Number.isFinite(count)) {
    return `${name} loses the record and the login behind it, permanently. If a pupil is still linked to the household the register will refuse — open the record first to see who, or block the sign-in instead.`
  }
  if (count > 0) {
    return `${count} ${count === 1 ? 'pupil is' : 'pupils are'} linked to this household, and the register will refuse to delete it while they are — every one of them would be left with no guardian. Move them to another household first, or block the sign-in instead.`
  }
  return `${name} loses the record and the login behind it, permanently. If they are only leaving for a while, deactivate the account instead — that closes the sign-in and keeps everything else.`
}

/**
 * Blocking and unblocking a guardian's sign-in, as the row offers it. Taking
 * the login away is asked about; giving it back is not.
 */
export const accessAction = {
  label: (row: Row) => (row.status === 'Deactivated' ? 'Allow sign-in' : 'Block sign-in'),
  title: (row: Row) =>
    row.status === 'Deactivated' ? 'Let them sign in again?' : 'Stop them signing in?',
  cta: (row: Row) =>
    row.status === 'Deactivated' ? 'Allow the sign-in' : 'Block the sign-in',
  confirm: (row: Row) =>
    row.status === 'Deactivated'
      ? undefined
      : 'The household, its children and every invoice already raised stay exactly as they are — the guardian simply cannot sign in to see them until this is put back.',
  done: (row: Row) =>
    row.status === 'Deactivated'
      ? `${row.name} can sign in again`
      : `${row.name} can no longer sign in`,
}
