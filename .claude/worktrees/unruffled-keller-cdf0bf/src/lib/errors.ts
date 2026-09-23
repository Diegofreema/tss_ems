import { ApiError } from '@/api/client'

/**
 * The API's own wording when it gave one, the caller's fallback otherwise —
 * a network or parse failure has no message worth showing anybody.
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback
}

/** The message the design shows when the request never reached the server. */
export const OFFLINE_MESSAGE =
  'We could not reach the school system. Check your connection and try again.'
