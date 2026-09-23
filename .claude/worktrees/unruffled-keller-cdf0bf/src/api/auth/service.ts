import { request } from '../client'
import type {
  ChangePasswordBody,
  CurrentUser,
  ForgotPasswordBody,
  ForgotPasswordResult,
  LoginBody,
  LoginResult,
  ResetPasswordBody,
  VerifyOtpBody,
  VerifyOtpResult,
} from './types'

export const authService = {
  /** Exchanges credentials for a 12-hour bearer token. */
  login: (body: LoginBody) => request<LoginResult>('users/login', { method: 'POST', body }),

  me: () => request<CurrentUser>('users/me'),

  /** Revokes the current token. Idempotent — a dead token still answers 200. */
  logout: () => request<unknown>('users/logout', { method: 'POST' }),

  /** Revokes every token for this account, on every device. */
  logoutEverywhere: () => request<unknown>('users/logout-all', { method: 'POST' }),

  /** Step 1: emails a 6-digit OTP and returns the id step 2 needs. */
  forgotPassword: (body: ForgotPasswordBody) =>
    request<ForgotPasswordResult>('users/forgot-password', { method: 'POST', body }),

  /** Step 2: trades the OTP for a single-use ticket. Five attempts, 15 minutes. */
  verifyOtp: (body: VerifyOtpBody) =>
    request<VerifyOtpResult>('users/verify-otp', { method: 'POST', body }),

  /** Step 3: needs the ticket from step 2. */
  resetPassword: (body: ResetPasswordBody) =>
    request<unknown>('users/reset-password', { method: 'POST', body }),

  /** The emailed-link route, which skips the OTP exchange. */
  changePassword: (body: ChangePasswordBody) =>
    request<unknown>('users/change-password', { method: 'POST', body }),
}
