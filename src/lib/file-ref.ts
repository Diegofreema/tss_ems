// Relative and extensioned, like the rest of what the node test runner reads.
import { PHOTO_BASE, photoSource } from './photo-url.ts'

/**
 * Where a stored file is read from, for the viewer that opens it.
 *
 * Three kinds, because the school keeps its files three ways:
 *
 * - **An address** an `<img>` or a frame can load as it stands — a teacher's
 *   photo in `staff_files/`, an office photo in `img/`. Both folders are
 *   public.
 * - **A student's file**, which is behind the school website's login, so it
 *   is fetched through `GET /users/download/{name}` with the token. A bare
 *   filename means this: every document a family sends — the birth
 *   certificate, the other certificates, the last school report, the
 *   passport — is stored that way on the student record.
 * - **An API path** that hands a file back, written `api:<path>` — a
 *   teacher's CV is `api:teachers/{id}/cv`, since the record names the file
 *   but the school serves it only through its own endpoint.
 */
export type FileRef = { url: string } | { download: string } | { api: string }

const API_PREFIX = 'api:'

/** A teacher's CV, as a documents tab hands it to the viewer. */
export const teacherCv = (teacherId: string | number) => `${API_PREFIX}teachers/${teacherId}/cv`

export function fileRef(value: string | null | undefined, base: string = PHOTO_BASE): FileRef | undefined {
  const stored = value?.trim()
  // The dash is what every row writes for "the school sent nothing".
  if (!stored || stored === '—') return undefined
  if (stored.startsWith(API_PREFIX)) {
    const path = stored.slice(API_PREFIX.length).replace(/^\/+/, '')
    return path ? { api: path } : undefined
  }
  // A folder path or an address is a photo's kind of reference.
  if (stored.includes('/')) return photoSource(stored, base)
  return { download: stored }
}

/** The part of a reference worth showing a person: the filename. */
export function fileLabel(value: string | null | undefined): string {
  const stored = value?.trim() ?? ''
  return stored.split('/').filter(Boolean).pop() ?? stored
}

export type FileKind = 'image' | 'pdf' | 'other'

const IMAGE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i
const PDF = /\.pdf$/i

/**
 * What the viewer can draw. The type the school sent is believed first; a
 * download often arrives as `application/octet-stream`, which says nothing,
 * so the filename's own extension answers then.
 */
export function fileKind(name: string, mime = ''): FileKind {
  const type = mime.toLowerCase()
  if (type.startsWith('image/')) return 'image'
  if (type === 'application/pdf') return 'pdf'
  const file = name.split(/[?#]/)[0]
  if (IMAGE.test(file)) return 'image'
  if (PDF.test(file)) return 'pdf'
  return 'other'
}

/** The type to give a blob the school sent without one, so a frame draws it. */
export function mimeFor(kind: FileKind, name: string): string {
  if (kind === 'pdf') return 'application/pdf'
  if (kind !== 'image') return ''
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (extension === 'jpg') return 'image/jpeg'
  if (extension === 'svg') return 'image/svg+xml'
  return `image/${extension}`
}
