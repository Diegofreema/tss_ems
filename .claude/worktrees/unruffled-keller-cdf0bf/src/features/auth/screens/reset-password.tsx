import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { useResetPassword } from '@/api/auth/hooks'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useRecordForm } from '@/hooks/use-record-form'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { useAuthStore } from '../auth.store'
import { AuthAlert } from '../components/auth-alert'
import { AuthHeading } from '../components/auth-heading'
import { PasswordInput } from '../components/password-input'
import { PasswordRules } from '../components/password-rules'
import { PasswordStrength } from '../components/password-strength'
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas'

const COPY = {
  reset: {
    kicker: 'Reset',
    title: 'Set a new password',
    description:
      'Choose something you have not used here before. It takes effect straight away.',
    cta: 'Save the new password',
  },
  first: {
    kicker: 'First sign in',
    title: 'Choose your password',
    description:
      'The office gave you a temporary password. Replace it now — the temporary one stops working as soon as you save.',
    cta: 'Save and continue',
  },
} as const

/** Serves both the reset link and the first-sign-in variant. */
export function ResetPasswordScreen({ first }: { first: boolean }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const userId = useAuthStore((state) => state.userId)
  const ticket = useAuthStore((state) => state.ticket)
  const completeReset = useAuthStore((state) => state.completeReset)
  const resetPassword = useResetPassword()
  const copy = first ? COPY.first : COPY.reset

  const form = useRecordForm<ResetPasswordValues>(resetPasswordSchema, {
    temporaryPassword: '',
    password: '',
    confirmPassword: '',
  })

  const password = form.watch('password') ?? ''

  const onSubmit = async (values: ResetPasswordValues) => {
    setFailure(null)
    try {
      // ponytail: the first-sign-in variant has no endpoint of its own yet —
      // a temporary password is not an OTP, and /users/change-password wants
      // the verification key from the invitation email. It falls through to
      // the confirmation screen until we know which of the two it is.
      if (userId !== null && ticket !== null) {
        await resetPassword.mutateAsync({
          user_id: userId,
          ticket,
          password: values.password,
          confirm_password: values.confirmPassword,
        })
      }
      completeReset()
      await navigate({ to: '/signed-in' })
    } catch (error) {
      setFailure(errorMessage(error, OFFLINE_MESSAGE))
    }
  }

  const { isSubmitting } = form.formState

  return (
    <>
      <AuthHeading
        kicker={copy.kicker}
        title={copy.title}
        description={copy.description}
      />
      <Rule />

      {failure && (
        <AuthAlert
          title={failure}
          body="The code lasts fifteen minutes and works once. Start again if it has expired."
        />
      )}

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-[18px]"
        >
          {first && (
            <PasswordInput<ResetPasswordValues>
              name="temporaryPassword"
              label="Temporary password"
              placeholder="From your invitation email"
              hint="The one the office gave you"
            />
          )}

          <div>
            <PasswordInput<ResetPasswordValues>
              name="password"
              label="New password"
              placeholder="At least 10 characters"
              visible={visible}
              onToggle={() => setVisible((previous) => !previous)}
            />
            <PasswordStrength password={password} />
          </div>

          <PasswordInput<ResetPasswordValues>
            name="confirmPassword"
            label="Repeat the new password"
            placeholder="Type it again"
            hint="Both must be identical"
            visible={visible}
          />

          <PasswordRules password={password} />

          <Button
            type="submit"
            pending={isSubmitting}
            className="w-full justify-start"
          >
            {isSubmitting ? 'Saving…' : copy.cta}
          </Button>
        </form>
      </FormProvider>
    </>
  )
}
