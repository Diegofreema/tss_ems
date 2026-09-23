import { noteServerTime } from '../lib/server-clock.ts'
import { getToken } from './token.ts'
import { buildUrl, type QueryValue } from './url.ts'
import type { ApiEnvelope, ApiFieldErrors } from './types.ts'

export { paginated } from './url.ts'
export type { QueryValue }

/**
 * Always same-origin. The API sends no `Access-Control-Allow-Origin`, so the
 * browser may not call it directly from anywhere — dev goes through Vite's
 * proxy and production through the rewrite in `vercel.json`, both of which
 * hand `/api` to the school's server from the server side.
 *
 * Absolute rather than the bare path, because `buildUrl` resolves against it.
 */
export const API_BASE_URL =
  import.meta.env?.VITE_API_URL ??
  // Off `globalThis` rather than `window`, and with a stand-in origin where
  // there is none: this module is imported by tests as well as by the browser,
  // and it used to throw on the way in wherever `window` was not defined,
  // which is what kept the whole client untested.
  `${globalThis.location?.origin ?? 'http://localhost'}/api`

/** Anything the API refused, with the field errors a form needs to show. */
export class ApiError extends Error {
  readonly status: number
  readonly errors?: ApiFieldErrors

  constructor(status: number, message: string, errors?: ApiFieldErrors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** JSON body. Mutually exclusive with `form`. */
  body?: unknown
  /** Multipart body, for the endpoints that take a file. */
  form?: FormData
  query?: Record<string, QueryValue>
  signal?: AbortSignal
}

/**
 * How long a request may sit before it is abandoned.
 *
 * The connection this app lives on fails by hanging, not by refusing: a
 * half-open link keeps a fetch pending for however long the OS takes to give
 * up on the socket, which can be minutes. The outbox sends strictly in order,
 * so one hung send held the whole queue's head — thirty marks waiting on a
 * socket nobody was coming back for. A timeout aborts the same way a dropped
 * connection does, which `classify` already reads as "not now, try again".
 *
 * File uploads are exempt: a CV over a slow link can honestly take longer
 * than any figure written here, and the queue never carries one anyway.
 */
const REQUEST_TIMEOUT_MS = 30_000

/**
 * The caller's signal, bounded by the timeout — where this browser can
 * combine the two. An old Safari without `AbortSignal.any` keeps the caller's
 * signal and loses the bound, which is the behaviour the app always had.
 */
function boundedSignal(signal: AbortSignal | undefined): AbortSignal | undefined {
  if (typeof AbortSignal.timeout !== 'function') return signal
  const bound = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  if (!signal) return bound
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, bound]) : signal
}

/**
 * One request, one place. Adds the bearer token, unwraps the envelope and
 * turns a refusal into `ApiError` — so a service function is only ever a URL,
 * a shape and a return type.
 */
export async function request<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<TData> {
  const response = await fetch(buildUrl(API_BASE_URL, path, options.query), {
    method: options.method ?? 'GET',
    headers: buildHeaders(options),
    body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    signal: options.form ? options.signal : boundedSignal(options.signal),
  })

  // Every answer re-anchors the school's clock, which is what an assignment's
  // countdown is measured against. See `lib/server-clock`.
  noteServerTime(response.headers.get('Date'))

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<TData> | null

  if (!payload) {
    throw new ApiError(response.status, response.statusText || 'The server sent nothing back.')
  }
  if (!payload.success) {
    throw new ApiError(response.status, payload.message, payload.errors)
  }
  return payload.data
}

/**
 * For the endpoints that answer with a file rather than the envelope — the CSV
 * export, the applicant download, a CV.
 */
export async function requestBlob(
  path: string,
  options: RequestOptions = {},
): Promise<Blob> {
  const response = await fetch(buildUrl(API_BASE_URL, path, options.query), {
    method: options.method ?? 'GET',
    headers: buildHeaders(options),
    signal: options.signal,
  })

  noteServerTime(response.headers.get('Date'))

  if (!response.ok) {
    // A refusal comes back as the ordinary envelope even here, so the reason
    // the API gave is what the toast says — not the bare HTTP status line.
    const refusal = (await response.json().catch(() => null)) as ApiEnvelope<never> | null
    throw new ApiError(
      response.status,
      refusal?.message || response.statusText || 'That file could not be downloaded.',
    )
  }
  return response.blob()
}

function buildHeaders(options: RequestOptions): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  // FormData sets its own multipart boundary; setting Content-Type breaks it.
  if (options.body !== undefined && !options.form) headers['Content-Type'] = 'application/json'
  return headers
}

/**
 * Builds the multipart body for the handful of endpoints that take a file.
 * Absent values are left out entirely, so a partial edit never blanks a field
 * the form did not show.
 */
export function toFormData(body: Record<string, string | number | File | undefined | null>): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue
    form.append(key, value instanceof File ? value : String(value))
  }
  return form
}
