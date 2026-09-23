import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { useResetPassword } from '@/api/auth/hooks'
import { getToken } from '@/api/token'
import { Button } from '@/components/ui/button'
import { useRecordForm } from '@/hooks/use-record-form'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { useAuthStore } from '../auth.store'
import { AuthAlert } from '../components/auth-alert'
import { authButton } from '../components/auth-button'
import { AuthPasswordField } from '../components/auth-field'
import { AuthHeading } from '../components/auth-heading'
import { PasswordRules } from '../components/password-rules'
import { PasswordStrength } from '../components/password-strength'
import { MINIMUM_LENGTH } from '../password'
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas'
import { refreshAccount } from '../session'

const COPY = {
  reset: {
    title: 'Set a new password',
    description:
      'Choose something you have not used here before. It takes effect straight away.',
    cta: 'Save the new password',
  },
  first: {
    title: 'Choose your password',
    description:
      'The office gave you a temporary password. Replace it now — the temporary one stops working as soon as you save.',
    cta: 'Save and continue',
  },
} as const

/** Serves both the reset link and the first-sign-in variant. */
export function ResetPasswordScreen({ first }: { first: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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
      /*
       * Somebody who came here from the default-password gate is still signed
       * in, and the account this device holds still says they are on the
       * password the office issued. `me` is cached for five minutes, so
       * without this the gate would go on standing in front of a portal whose
       * password has just been changed. Asked again rather than edited: the
       * school is the one that decides when the flag drops.
       */
      if (getToken() !== null) await refreshAccount(queryClient).catch(() => undefined)
      await navigate({ to: '/signed-in' })
    } catch (error) {
      setFailure(errorMessage(error, OFFLINE_MESSAGE))
    }
  }

  const { isSubmitting } = form.formState

  return (
    <>
      <AuthHeading title={copy.title} description={copy.description} />

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
          className="mt-(--auth-gap) flex flex-col gap-(--auth-gap)"
        >
          {first && (
            <AuthPasswordField<ResetPasswordValues>
              name="temporaryPassword"
              label="Temporary password"
              placeholder="From your invitation email"
              icon={Lock}
              visible={visible}
              onToggle={() => setVisible((previous) => !previous)}
            />
          )}

          <div>
            <AuthPasswordField<ResetPasswordValues>
              name="password"
              label="New password"
              placeholder={`At least ${MINIMUM_LENGTH} characters`}
              icon={Lock}
              autoComplete="new-password"
              visible={visible}
              onToggle={() => setVisible((previous) => !previous)}
            />
            <PasswordStrength password={password} />
          </div>

          <div>
            <AuthPasswordField<ResetPasswordValues>
              name="confirmPassword"
              label="Repeat the new password"
              placeholder="Type it again"
              icon={Lock}
              autoComplete="new-password"
              visible={visible}
              onToggle={() => setVisible((previous) => !previous)}
            />
            <PasswordRules password={password} />
          </div>

          <Button type="submit" pending={isSubmitting} className={authButton}>
            {isSubmitting ? 'Saving…' : copy.cta}
          </Button>
        </form>
      </FormProvider>
    </>
  )
}
