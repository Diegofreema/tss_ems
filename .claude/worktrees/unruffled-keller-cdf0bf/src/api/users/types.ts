import type { Id, PageParams, Place } from '../types.ts'

/** A login account. Every portal's person hangs off one of these. */
export type User = {
  id: number
  username: string
  role_id: number
  fname: string
  lname: string
  mname: string | null
  gender: string | null
  address: string | null
  country_id: number | null
  state_id: number | null
  phone: string | null
  department_id: number | null
  profile: string | null
  dob: string | null
  created_date: string
  created_by: number
  passport: string | null
  useruniquid: string | null
  userstatus: UserStatus
  role?: Role
  /**
   * Expanded by `GET /users/admins/{id}` only. The same join is why that
   * endpoint refuses a login whose ids are 0 — see the note on the service.
   */
  country?: Place
  state?: Place
}

/** The API spells these two exactly; anything else is refused. */
export type UserStatus = 'Enabled' | 'Disabled'

export type Role = {
  id: number
  role_name: string
}

export type Privilege = {
  id: number
  name: string
}

/** The office record behind an admin login. */
export type Admin = {
  id: number
  user_id: number
  surname: string
  lastname: string
  status: string
  date_created: string
  adminphoto: string | null
  gender: string | null
  department_id: number | null
  phone: string | null
  address: string | null
  dob: string | null
  profile: string | null
  privileges?: Privilege[]
  department?: { id: number; name: string; deptcode: string }
  user?: User
}

export type UserListParams = PageParams & {
  /** Matches username, first or last name. */
  q?: string
}

export type CreateUserBody = {
  username: string
  password: string
  role_id: number
  fname: string
  lname: string
  gender?: string
  address?: string
  country_id?: number
  state_id?: number
  phone?: string
  department_id?: number
}

export type SetUserStatusBody = {
  id: Id
  status: UserStatus
}

/**
 * The admin profile form. `passport` is the photo upload, so this goes out as
 * multipart rather than JSON.
 */
export type UpdateProfileBody = {
  surname?: string
  lastname?: string
  gender?: string
  phone?: string
  address?: string
  profile?: string
  passport?: File
}

export type UpdateAdminBody = UpdateProfileBody & {
  dob?: string
  role_id?: number
}

/**
 * The counters behind the admin home page. Every one is a count except the
 * last two, which the API says are money and which do not agree with the
 * ledgers they claim to total — `total_revenue` reads 0 on a school with
 * settled invoices, and `fees_collected` matches no amount on record. Nothing
 * on the dashboard reads either; the money comes from the invoice and
 * spending ledgers instead.
 */
export type DashboardStats = {
  students: number
  applied: number
  /** Reads 0 on a school with pupils enrolled. Use `students`. */
  current_students: number
  alumni: number
  teachers: number
  subjects: number
  classes: number
  fees: number
  hostels: number
  admins: number
  parents: number
  trequests: number
  course_regs: number
  exams_count: number
  attendance_count: number
  fees_collected: number
  total_revenue: number
}

/**
 * Admin home counters plus the revenue graph.
 *
 * `revenue_by_month` is a day per entry despite its name, and its figures come
 * from the transactions table rather than the invoice ledger — the two do not
 * reconcile, so the dashboard charts the invoices it can also total in tiles.
 */
export type UsersDashboard = {
  stats: DashboardStats
  revenue_by_month: { amount: number; txdate: string }[]
  transactions_last_180_days: unknown[]
}

export type StudentFeeStatus = {
  student_id: number
  paid_count: number
  outstanding: boolean
}
