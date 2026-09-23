import { create } from 'zustand'
import type { Role } from './role'

type AuthState = {
  /** Carried between screens; deliberately not put in the URL. */
  email: string
  /** Known once an account has signed in; the recovery screens never learn it. */
  role: Role | null
  /** Step 1 of the reset hands this over; steps 2 and 3 cannot run without it. */
  userId: number | null
  /** The single-use ticket from step 2. Dropped as soon as it is spent. */
  ticket: string | null
  /** Drives the wording on the final screen. */
  passwordChanged: boolean
  /**
   * The address the last reset code went to, and when this device asked for
   * it. Together they are the resend wait — see `resend.ts`. Kept here rather
   * than on a screen because both screens that can ask for a code have to
   * honour the same one; a per-screen timer is bypassed by walking back a
   * page.
   */
  codeSentTo: string | null
  codeSentAt: number | null
  /**
   * Set when a sign-in the office has switched off is turned away, so the form
   * they land on can say why. Carried here rather than in the URL for the same
   * reason `email` is: it names an account.
   */
  disabled: boolean

  identify: (email: string, role: Role | null) => void
  markDisabled: () => void
  clearDisabled: () => void
  startRecovery: (email: string, userId: number) => void
  /** A second code, for the same address, from the code screen. */
  noteCodeSent: (email: string) => void
  setTicket: (ticket: string) => void
  completeReset: () => void
  reset: () => void
}

const SIGNED_OUT = {
  email: '',
  role: null,
  userId: null,
  ticket: null,
  passwordChanged: false,
  disabled: false,
  codeSentTo: null,
  codeSentAt: null,
} as const

export const useAuthStore = create<AuthState>()((set) => ({
  ...SIGNED_OUT,

  identify: (email, role) => set({ email, role }),
  markDisabled: () => set({ disabled: true }),
  clearDisabled: () => set({ disabled: false }),
  // Step 1 *is* a code being sent, so the wait starts here and not only on
  // the resend button.
  startRecovery: (email, userId) =>
    set({ email, userId, ticket: null, codeSentTo: email, codeSentAt: Date.now() }),
  noteCodeSent: (email) => set({ codeSentTo: email, codeSentAt: Date.now() }),
  setTicket: (ticket) => set({ ticket }),
  // The ticket is single-use, so it goes the moment it has been spent.
  completeReset: () => set({ passwordChanged: true, userId: null, ticket: null }),
  reset: () => set(SIGNED_OUT),
}))
