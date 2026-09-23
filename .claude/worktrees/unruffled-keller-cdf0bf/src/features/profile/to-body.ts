import type { UpdateProfileBody } from '../../api/users/types.ts'

/**
 * The two halves of the name, in the order the record itself keeps them.
 *
 * The admin record spells them `surname` and `lastname`, and the words alone
 * do not say which is the family name — but the form is prefilled from that
 * record, surname first, so the box is read back apart the same way round it
 * was filled. Only an administrator can save a profile at all, and only from a
 * form filled in from their own office record.
 */
function splitName(fullname: string): { surname: string; lastname: string } {
  const [first = '', ...rest] = fullname.trim().split(/\s+/)
  return { surname: first, lastname: rest.join(' ') }
}

/**
 * The profile form as `PATCH /users/profile` wants it.
 *
 * Only the keys the endpoint accepts are sent — a staff number, a work email
 * and an office are held elsewhere, and the form still shows them. Keys the
 * portal never rendered come out `undefined` and are dropped by `toFormData`,
 * so a partial form can never blank a field it did not show.
 */
export function profileBody(values: Record<string, unknown>): UpdateProfileBody {
  const text = (key: string) =>
    typeof values[key] === 'string' ? (values[key] as string).trim() : undefined

  const fullname = text('fullname')

  return {
    ...(fullname ? splitName(fullname) : {}),
    phone: text('phone'),
    address: text('address'),
    // The job on the office record. The form calls it `job`, since `profile`
    // is what the whole page is called.
    profile: text('job'),
  }
}
