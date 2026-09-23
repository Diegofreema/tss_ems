import type { PageParams } from '../types.ts'
import type { Admin, Privilege } from '../users/types.ts'

export type { Admin, Privilege }

/** One line of the audit trail. */
export type ActivityLog = {
  id: number
  title: string
  timestamp: string
  user_id: number
  description: string
  ip: string
  type: string
}

export type AdminListParams = PageParams

/**
 * The login and the office record are created together; the account starts
 * Enabled on the default password, to be changed on first sign-in.
 */
export type CreateAdminBody = {
  username: string
  surname: string
  lastname: string
  middlename?: string
  gender?: string
  department_id?: number
  phone?: string
  address?: string
}

export type UpdateAdminRecordBody = Omit<CreateAdminBody, 'username'> & {
  /** Optional on an edit: left empty, the sign-in is not touched. */
  username?: string
}

/** Replaces the privilege set with exactly these ids. */
export type SetPrivilegesBody = {
  privileges: number[]
}

export type AdminPrivileges = {
  /** With `privileges` expanded — the ones this administrator actually holds. */
  admin: Admin
  /** Everything that could be granted, whether held or not. */
  available: Privilege[]
}

export type AdminActivity = {
  admin: Pick<Admin, 'id' | 'surname' | 'lastname'>
  logs: ActivityLog[]
}
