import type { CreateStaffBody, UpdateStaffBody } from '../../../api/teachers/types.ts'
import type { CreateAdminBody, UpdateAdminRecordBody } from '../../../api/admins/types.ts'
import { isoDate } from '../../../features/collections/birthday.ts'
import {
  schoolCountryId,
  STATES_KNOWN_FOR,
} from '../../../features/collections/country-ids.ts'

/** The form's values, all strings from the inputs and selects. */
export type FormValues = Record<string, unknown>

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/** A document the office attached, under its field name — or no key at all. */
function attached<K extends string>(key: K, value: unknown): Partial<Record<K, File>> {
  return value instanceof File ? ({ [key]: value } as Record<K, File>) : {}
}

function asId(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * What both endpoints ask for in the same words. Fields left empty are dropped
 * rather than sent blank, so editing one section never clears another.
 */
function common(values: FormValues) {
  return {
    // The rule above, and its one exception: a middle name is the only part
    // of a name nobody has to have, so an empty box here means the staff
    // member has none rather than "leave what is on file". Dropped, the name
    // the office just deleted would still be there on the next read.
    middlename: text(values.middlename) ?? null,
    gender: text(values.gender),
    address: text(values.address),
    phone: text(values.phone),
    department_id: asId(values.department_id),
  }
}

/**
 * The staff form as `POST /teachers` wants it. The username is the login's
 * email address, created alongside the record.
 */
export function teacherBody(values: FormValues): CreateStaffBody {
  return {
    ...common(values),
    username: text(values.username) ?? '',
    firstname: text(values.firstname) ?? '',
    lastname: text(values.lastname) ?? '',
    qualification: text(values.qualification),
    profile: text(values.profile),
    // The arm to make them class teacher of, as the select holds it. Dropped
    // when empty rather than sent null: a teacher may take no arm, and an
    // edit that touched another field should not unseat them from theirs.
    class_arm_id: text(values.class_arm_id),
    // Onto the login behind the record — the teaching row has no birthday of
    // its own — as the date the office picked, not the one the browser read.
    dob: isoDate(values.dob),
    /*
     * The form no longer asks which country, because the only states this
     * school can number are Nigeria's — see `country-ids.ts` — so a state
     * chosen at all is a Nigerian one and the country follows from it. Sent
     * from the same table the state ids come out of rather than written as a
     * number here, and left off entirely where no state was picked: an
     * address with a country and no state says less than one with neither.
     */
    country_id: asId(values.state) ? schoolCountryId(STATES_KNOWN_FOR) : undefined,
    state_id: asId(values.state),
    // The passport photograph, asked for on a new teacher only, and left off
    // entirely when not attached.
    ...attached('passports', values.passports),
  }
}

/**
 * The same body on an edit, which takes the email too — a teacher who has
 * changed address is corrected here rather than left signing in as who they
 * were. An empty box means "leave it alone", not "rename to nothing".
 */
export function teacherUpdate(values: FormValues): UpdateStaffBody {
  const { username, ...body } = teacherBody(values)
  return username ? { ...body, username } : body
}

/**
 * The same form as `POST /admins/new-admin` wants it. This endpoint calls the
 * first half of the name `surname`, so the form's `firstname` goes there.
 */
export function adminBody(values: FormValues): CreateAdminBody {
  return {
    ...common(values),
    username: text(values.username) ?? '',
    surname: text(values.firstname) ?? '',
    lastname: text(values.lastname) ?? '',
    // The calendar hands back a Date; a form opened on a record that holds no
    // birthday leaves it undefined, which drops the key rather than sending an
    // empty string over a date the office may have on file elsewhere.
    dob: isoDate(values.dob),
  }
}

/** The same on the office record: a corrected address is saved, a blank one ignored. */
export function adminUpdate(values: FormValues): UpdateAdminRecordBody {
  const { username, ...body } = adminBody(values)
  return username ? { ...body, username } : body
}
