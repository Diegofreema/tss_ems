/**
 * Where a person's photograph is read from.
 *
 * The school stores a photo as a bare filename — `passport` on a teacher,
 * `adminphoto` on an office record, `passporturl` on a student — in three
 * folders of its own website under `/backend`, which are not alike. Measured
 * on portal.tss.sch.ng 2026-10-02:
 *
 * - `staff_files/` holds teachers' photos and is public: an ordinary address,
 *   200 `image/png`.
 * - `img/` holds the office's (`adminphoto`) and is public too. Not
 *   `staff_files/` — the same filename there is a 404, which is what bronze,
 *   where this was first written, did not have to know.
 * - `student_files/` holds students'. It is not public — the folder answers
 *   403 to a browser — so a student's photo is fetched through the API with
 *   the portal's token, `GET /users/download/{name}`, which serves from
 *   `webroot/student_files`. Six of the seven student photos on file came
 *   back that way (200, the image). The seventh, enrolment 226's, answers
 *   "File not found." — the school holds the filename but not the file in
 *   that folder — and shows the student's initials, which is the honest
 *   answer rather than a broken image.
 *
 * Same-origin, under `/backend` beside the API, so dev (through Vite's proxy)
 * and production are the same address. `VITE_PHOTO_BASE` overrides it for a
 * school whose files live elsewhere.
 */
export const PHOTO_BASE: string =
  import.meta.env?.VITE_PHOTO_BASE ??
  `${globalThis.location?.origin ?? 'http://localhost'}/backend/`

export const STAFF_FOLDER = 'staff_files'
export const OFFICE_FOLDER = 'img'
export const STUDENT_FOLDER = 'student_files'

const isAddress = (value: string) => /^(https?:)?\/\//i.test(value)

function inFolder(folder: string, stored: string | null | undefined): string {
  const name = stored?.trim()
  if (!name) return ''
  // An address the school sends whole is kept whole, so the day it starts
  // doing that nothing here has to change.
  return isAddress(name) ? name : `${folder}/${name.replace(/^\/+/, '')}`
}

/** A teacher's `passport`, as a row keeps it. */
export const staffPhoto = (stored: string | null | undefined) => inFolder(STAFF_FOLDER, stored)

/** An office record's `adminphoto`, as a row keeps it. */
export const officePhoto = (stored: string | null | undefined) => inFolder(OFFICE_FOLDER, stored)

/** A student's `passporturl`, as a row keeps it. */
export const studentPhoto = (stored: string | null | undefined) => inFolder(STUDENT_FOLDER, stored)

/**
 * How to get the picture a row names: an address an `<img>` can load as it
 * stands, or a stored filename to ask the API for with the token. Nothing
 * where there is no photo, so the initials show.
 */
export type PhotoSource = { url: string } | { download: string } | undefined

export function photoSource(stored: string | null | undefined, base: string = PHOTO_BASE): PhotoSource {
  const value = stored?.trim()
  // The dash is what every row writes for "the school sent nothing".
  if (!value || value === '—') return undefined
  if (isAddress(value)) return { url: value }
  const path = value.replace(/^\/+/, '')
  if (path.startsWith(`${STUDENT_FOLDER}/`)) {
    const name = path.slice(STUDENT_FOLDER.length + 1)
    return name ? { download: name } : undefined
  }
  // Each segment escaped rather than the whole, so a space in a filename
  // still loads and the folder keeps its slash.
  const escaped = path.split('/').map((segment) => encodeURIComponent(segment)).join('/')
  return { url: `${base.replace(/\/+$/, '')}/${escaped}` }
}
