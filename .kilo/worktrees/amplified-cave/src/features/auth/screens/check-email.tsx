import { useNavigate } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { useForgotPassword, useVerifyOtp } from '@/api/auth/hooks'
import { Button } from '@/components/ui/button'
import { useRecordForm } from '@/hooks/use-record-form'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { useAuthStore } from '../auth.store'
import { AuthAlert } from '../components/auth-alert'
import { authButton, authButtonQuiet } from '../components/auth-button'
import { AuthField } from '../components/auth-field'
import { AuthHeading } from '../components/auth-heading'
import { resendLabel } from '../resend'
import { verifyOtpSchema, type VerifyOtpValues } from '../schemas'
import { useResendWait } from '../use-resend'

/**
 * Step 2 of three. The email carries a six-digit code rather than a link, so
 * the code is typed here and traded for the single-use ticket step 3 needs.
 */
export function CheckEmailScreen() {
  const navigate = useNavigate()
  const email = useAuthStore((state) => state.email)
  const userId = useAuthStore((state) => state.userId)
  const setTicket = useAuthStore((state) => state.setTicket)
  const noteCodeSent = useAuthStore((state) => state.noteCodeSent)
  const verifyOtp = useVerifyOtp()
  const forgotPassword = useForgotPassword()
  const [failure, setFailure] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  // Already running when this screen opens: the code that brought the person
  // here was itself a send.
  const wait = useResendWait(email)

  const form = useRecordForm<VerifyOtpValues>(verifyOtpSchema, { otp: '' })

  const onSubmit = async (values: VerifyOtpValues) => {
    if (userId === null) return
    setFailure(null)
    try {
      const { ticket } = await verifyOtp.mutateAsync({
        user_id: userId,
        otp_code: values.otp,
      })
      setTicket(ticket)
      await navigate({ to: '/reset-password' })
    } catch (error) {
      setFailure(errorMessage(error, OFFLINE_MESSAGE))
    }
  }

  const sendAgain = async () => {
    // The button is disabled while the wait runs; this is the second lock, for
    // a click that gets past it — a stale render, an Enter key held down.
    if (wait > 0) return
    setFailure(null)
    try {
      await forgotPassword.mutateAsync({ username: email })
      // Only a code the school actually took starts a new wait. A send that
      // failed has cost the person nothing and must not cost them a minute.
      noteCodeSent(email)
      setResent(true)
    } catch (error) {
      setFailure(errorMessage(error, OFFLINE_MESSAGE))
    }
  }

  const { isSubmitting } = form.formState

  return (
    <>
      <AuthHeading
        title="Check your email"
        description="If an account uses that address, a six-digit code is on its way. It expires in fifteen minutes and can only be used once."
      />
      <div className="mt-(--auth-gap) flex items-center gap-3 rounded-md bg-ui-field px-4 py-3.5 text-base font-medium">
        <Mail className="size-5 flex-none text-ui-hint" strokeWidth={1.8} />
        {email || 'the address on your account'}
      </div>

      {failure && (
        <AuthAlert
          title={failure}
          body="The code lasts fifteen minutes. Send a new one if it has expired."
        />
      )}

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="mt-(--auth-gap) flex flex-col gap-4"
        >
          <AuthField<VerifyOtpValues>
            name="otp"
            label="Six-digit code"
            placeholder="123456"
            autoComplete="one-time-code"
          />

          <Button type="submit" pending={isSubmitting} className={`mt-3 ${authButton}`}>
            {isSubmitting ? 'Checking the code…' : 'Continue'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={wait > 0}
            pending={forgotPassword.isPending}
            onClick={sendAgain}
            className={authButtonQuiet}
          >
            {resendLabel(wait, forgotPassword.isPending)}
          </Button>
        </form>
      </FormProvider>

      <div className="mt-(--auth-tail) text-[13px] leading-relaxed text-ui-muted">
        {/* Said once the wait is over rather than beside the countdown, which
            is already saying it. "Sent again" used to sit on the button for
            the rest of the screen's life, so a person who came back two
            minutes later read it as a button that had stopped working. */}
        {resent && wait === 0 && (
          <p className="mb-2">A new code is on its way — use the most recent one.</p>
        )}
        {wait > 0
          ? 'Codes take a moment to arrive. Look in spam while you wait; you can ask for another in a minute.'
          : 'Nothing after a few minutes? Look in spam, then check the address with the school office.'}
      </div>
    </>
  )
}
