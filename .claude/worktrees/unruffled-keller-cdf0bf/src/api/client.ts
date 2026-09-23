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
    signal: options.signal,
  })

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
