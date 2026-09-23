import type { PageParams } from '../types.ts'

/**
 * One chargeable fee. `amount` comes back as an integer, and `status` and
 * `is_active` say the same thing twice — 1/0 beside true/false.
 */
export type Fee = {
  id: number
  name: string
  amount: string | number
  feetype: FeeType
  itemcode: string | null
  /** The code the Remita gateway bills under, where the school uses one. */
  remitaitemcode: string | null
  /** 1 while the fee is charged, 0 once it is retired. */
  status: number
  is_active?: boolean
  /** Both null on every fee seen so far; the API keeps the columns anyway. */
  startdate: string | null
  enddate: string | null
  user_id: number
  /** The name of whoever created it, not an id — the list joins it in. */
  created_by?: string
  /** What it is allocated to. Only the detail endpoint expands these. */
  departments?: { id: number; name: string; deptcode?: string }[]
  levels?: { id: number; name: string }[]
  /** How many invoices, transactions and transcript requests point at it. */
  dependencies?: Record<string, number>
}

/** The only two the API accepts. */
export type FeeType = 'enrolled' | 'none_enrolled'

export type FeeListParams = PageParams & {
  /** 1 for active, 0 for inactive. */
  status?: 0 | 1
  feetype?: FeeType
  /** Matches the fee name or the item code. */
  q?: string
}

/** The classes, levels and fee types the create and edit forms offer. */
export type FeeOptions = Record<string, unknown>

/**
 * `amount` accepts "30,000" and "30000.00" alike. Passing `departments` or
 * `levels` replaces that whole set.
 */
export type FeeBody = {
  name: string
  amount: string
  feetype: FeeType
  itemcode?: string
  departments?: number[]
  levels?: number[]
}

/**
 * `departments` replaces the whole set, so `[]` clears it. `levels` is only
 * touched when the key is present.
 */
export type AllocateFeeBody = {
  departments: number[]
  levels?: number[]
}
