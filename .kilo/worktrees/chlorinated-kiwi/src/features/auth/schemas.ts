import { z } from 'zod'
import { MINIMUM_SCORE, passwordScore } from './password'

const email = z
  .string()
  .trim()
  .min(1, 'Required')
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'That does not look like an email address')

export const signInSchema = z.object({
  /**
   * The API calls this the username: an email address for staff, a
   * registration number for students. So it cannot be held to the email shape.
   */
  username: z.string().trim().min(1, 'Required'),
  password: z.string().min(6, 'Your password is at least six characters'),
  remember: z.boolean(),
})

export const verifyOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'The code is six digits'),
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    /** Only present on the first-sign-in variant. */
    temporaryPassword: z.string().optional(),
    password: z
      .string()
      .refine(
        (value) => passwordScore(value) >= MINIMUM_SCORE,
        'This password is not strong enough yet',
      ),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match',
  })

export type SignInValues = z.infer<typeof signInSchema>
export type VerifyOtpValues = z.infer<typeof verifyOtpSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
