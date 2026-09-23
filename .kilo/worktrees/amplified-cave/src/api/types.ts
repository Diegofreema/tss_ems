/**
 * Every NETPRO endpoint answers with the same envelope, so unwrapping it is
 * the client's job and no service ever sees `success`.
 */
export type ApiEnvelope<TData> =
  | { success: true; message?: string; data: TData }
  | { success: false; message: string; errors?: ApiFieldErrors }

/** `{ department_id: { _isUnique: "This arm name already exists" } }` */
export type ApiFieldErrors = Record<string, Record<string, string>>

export type Pagination = {
  page: number
  limit: number
  total: number
  pages: number
}

/** Query string shared by every list endpoint. */
export type PageParams = {
  page?: number
  limit?: number
}

/**
 * Lists arrive under a per-endpoint key (`invoices`, `students`, …) beside a
 * `pagination` block. Services normalise both into this so the UI reads one
 * shape whatever it asked for.
 */
export type Paginated<TItem> = {
  items: TItem[]
  pagination: Pagination
}

/**
 * A country or a state, as the API expands one beside a record. It expands
 * `state_id` and `country_id` independently and never checks they agree, so
 * `country_id` here is what says whether the pair makes sense.
 */
export type Place = {
  id: number
  name: string
  country_id?: number
}

/** Value the API accepts for an `id` path segment. */
export type Id = number | string
