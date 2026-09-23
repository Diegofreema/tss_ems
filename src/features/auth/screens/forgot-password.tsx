import { Link, useNavigate } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { FormProvider } from 'react-hook-form'
import { useForgotPassword } from '@/api/auth/hooks'
import { Button } from '@/components/ui/button'
import { useRecordForm } from '@/hooks/use-record-form'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { useAuthStore } from '../auth.store'
import { authButton } from '../components/auth-button'
import { AuthField } from '../components/auth-field'
import { AuthHeading } from '../components/auth-heading'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas'
import { useResendWait } from '../use-resend'

export function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const forgotPassword = useForgotPassword()
  const startRecovery = useAuthStore((state) => state.startRecovery)

  const form = useRecordForm<ForgotPasswordValues>(forgotPasswordSchema, {
    email: '',
  })

  /*
   * The same wait the code screen honours, because this screen can send a code
   * too: the back button from there lands here, and a timer the second screen
   * owned alone would be a timer one click walks around. Scoped to the
   * address, so somebody who mistyped theirs can try another at once — the
   * wait is about one inbox being mailed repeatedly, not about the person.
   */
  const typed = form.watch('email')
  const wait = useResendWait(typeof typed === 'string' ? typed : '')

  const onSubmit = async (values: ForgotPasswordValues) => {
    // Disabled already; this catches a submit that got past it — the Enter key
    // on the field, a render behind the countdown.
    if (wait > 0) return
    try {
      // Step 1 hands back the id the next two steps are addressed to.
      const { user_id } = await forgotPassword.mutateAsync({
        username: values.email,
      })
      startRecovery(values.email, user_id)
      await navigate({ to: '/check-email' })
    } catch (error) {
      // Under the field rather than in a banner: every refusal this endpoint
      // gives is about the address that was typed — the school does not know
      // it, or the device could not reach the school to ask.
      form.setError('email', {
        message: errorMessage(error, OFFLINE_MESSAGE),
      })
    }
  }

  const { isSubmitting } = form.formState

  return (
    <>
      <AuthHeading
        title="Forgotten password"
        description="Enter email address to get one time reset code"
      />

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-(--auth-gap)">
          <AuthField<ForgotPasswordValues>
            name="email"
            label="Email Address"
            type="email"
            placeholder="Enter email address"
            icon={Mail}
            autoComplete="username"
          />

          <Button
            type="submit"
            disabled={wait > 0}
            pending={isSubmitting}
            className={`mt-(--auth-tail) ${authButton}`}
          >
            {isSubmitting
              ? 'Sending the code…'
              : wait > 0
                ? `Send Code in ${wait}s`
                : 'Send Code'}
          </Button>

          {wait > 0 && (
            <p className="mt-3 text-center text-[13px] leading-relaxed text-ui-muted">
              A code has just gone to this address. Give it a minute — a new one
              replaces the old, so asking again too quickly cancels the code you
              are waiting for.
            </p>
          )}
        </form>
      </FormProvider>

      <p className="mt-(--auth-tail) text-center text-base">
        Remember Password?{' '}
        <Link to="/sign-in" className="font-semibold text-ui-blue-ink hover:underline">
          Sign In
        </Link>
      </p>
    </>
  )
}
