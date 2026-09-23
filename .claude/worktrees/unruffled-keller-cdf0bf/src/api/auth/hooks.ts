import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { endSession, useSessionStore } from '@/stores/session.store'
import { setToken } from '../token'
import { authKeys } from './keys'
import { authService } from './service'
import type {
  ChangePasswordBody,
  ForgotPasswordBody,
  LoginBody,
  ResetPasswordBody,
  VerifyOtpBody,
} from './types'

/**
 * What signing in takes: the credentials the API is sent, plus the choice
 * about this device, which it is not — the server offers no way to ask for a
 * longer session, so `remember` only decides where the token is kept.
 */
export type LoginInput = LoginBody & { remember: boolean }

/**
 * Signing in stores the bearer token before anything else runs, so the `me`
 * request that follows — and every query a redirect kicks off — already
 * carries it.
 *
 * The account is stored too, and not into the `me` cache: it is what every
 * later `me` answer is checked against. Only login is made to prove who is
 * asking, so only login can say who this session belongs to — see
 * `accountOfRecord`. The token is deliberately left out of it; it lives in one
 * place already.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ username, password }: LoginInput) =>
      authService.login({ username, password }),
    // The sign-in screen shows a refusal in the design's own alert.
    meta: { success: 'Signed in', ownsError: true },
    onSuccess: (result, { remember }) => {
      setToken(result.token, { remember, expires: result.expires })
      useSessionStore.getState().setAccount({
        user: result.user,
        role: result.role,
        profile_type: result.profile_type,
        profile: result.profile,
      })
      queryClient.removeQueries({ queryKey: authKeys.me() })
    },
  })
}

/**
 * Shared with the portal route guards, which resolve the account before the
 * shell renders rather than through a hook.
 */
export function meQueryOptions() {
  return queryOptions({
    queryKey: authKeys.me(),
    queryFn: () => authService.me(),
    staleTime: 5 * 60_000,
    // A refused token will be refused again, and a portal guard waiting out a
    // retry is a portal that renders nothing for a second longer.
    retry: false,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authService.logout(),
    meta: { success: 'Signed out' },
    // Ends the session whether or not the server agreed — a refused logout
    // must still end it on this device.
    onSettled: () => endSession(queryClient),
  })
}

/** Kept apart from `useLogout` so each can say what it actually did. */
export function useLogoutEverywhere() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authService.logoutEverywhere(),
    meta: { success: 'Signed out on every device' },
    onSettled: () => endSession(queryClient),
  })
}

// The four recovery screens each render the failure in their own alert.
export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: ForgotPasswordBody) => authService.forgotPassword(body),
    meta: { success: 'Reset code sent', ownsError: true },
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (body: VerifyOtpBody) => authService.verifyOtp(body),
    meta: { success: 'Code accepted', ownsError: true },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: ResetPasswordBody) => authService.resetPassword(body),
    meta: { success: 'Password saved', ownsError: true },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordBody) => authService.changePassword(body),
    meta: { success: 'Password changed', ownsError: true },
  })
}
