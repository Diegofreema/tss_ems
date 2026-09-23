import type { Parent } from '../parents/types.ts'
import type { Student } from '../students/types.ts'
import type { Teacher } from '../teachers/types.ts'
import type { Admin, Role, User } from '../users/types.ts'

export type LoginBody = {
  /** The account's username — a reg number for students, an email for staff. */
  username: string
  password: string
}

/**
 * Which kind of person the login belongs to, as the API spells it. This — not
 * the role name — is what decides the portal: `role_name` is free text a
 * school can rename, and it renames it badly. A guardian's login comes back
 * under the role "Rector"; `profile_type` on the same answer says `parent`,
 * which is the truth.
 *
 * A guardian is spelled both ways depending on the endpoint: the table is
 * `sparents` and login answers `parent`.
 */
export type ProfileType = 'admin' | 'teacher' | 'student' | 'sparent' | 'parent'

/** The role record itself. Which of the four it is follows `profile_type`. */
export type Profile = Admin | Teacher | Student | Parent

/**
 * The signed-in account: the login, the role it holds, and the record for
 * whichever kind of person it belongs to. `/users/me` answers with exactly
 * this; login answers with this plus a token.
 */
export type Account = {
  user: User
  role?: Role
  profile_type?: ProfileType
  profile?: Profile
}

export type LoginResult = Account & {
  token: string
  /** ISO timestamp; the token lasts 12 hours. */
  expires: string
  /** Empty on every response seen so far, so left unnarrowed. */
  warnings?: unknown[]
}

export type CurrentUser = Account

export type ForgotPasswordBody = {
  /** The address the OTP is emailed to. */
  username: string
}

/** Step 1 hands back the id step 2 needs. */
export type ForgotPasswordResult = {
  user_id: number
}

export type VerifyOtpBody = {
  user_id: number
  otp_code: string
}

/** Single-use, 15-minute ticket. A user_id alone cannot reset a password. */
export type VerifyOtpResult = {
  ticket: string
}

export type ResetPasswordBody = {
  user_id: number
  ticket: string
  password: string
  confirm_password: string
}

/** For the emailed verification-key links, which carry no OTP. */
export type ChangePasswordBody = {
  key: string
  password: string
}
