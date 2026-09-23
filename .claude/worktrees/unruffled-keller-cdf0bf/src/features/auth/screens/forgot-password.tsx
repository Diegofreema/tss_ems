import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { useForgotPassword } from '@/api/auth/hooks'
import { TextField } from '@/components/form/text-field'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useRecordForm } from '@/hooks/use-record-form'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { useAuthStore } from '../auth.store'
import { AuthAlert } from '../components/auth-alert'
import { AuthHeading } from '../components/auth-heading'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas'

export function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const forgotPassword = useForgotPassword()
  const startRecovery = useAuthStore((state) => state.startRecovery)
  const [failure, setFailure] = useState<string | null>(null)

  const form = useRecordForm<ForgotPasswordValues>(forgotPasswordSchema, {
    email: '',
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    setFailure(null)
    try {
      // Step 1 hands back the id the next two steps are addressed to.
      const { user_id } = await forgotPassword.mutateAsync({
        username: values.email,
      })
      startRecovery(values.email, user_id)
      await navigate({ to: '/check-email' })
    } catch (error) {
      setFailure(errorMessage(error, OFFLINE_MESSAGE))
    }
  }

  const { isSubmitting } = form.formState

  return (
    <>
      <Button asChild variant="ghost" className="mb-4 px-0 text-brand">
        <Link to="/sign-in">
          <ChevronLeft className="size-3.5" strokeWidth={2} />
          Back to sign in
        </Link>
      </Button>

      <AuthHeading
        kicker="Reset"
        title="Forgotten password"
        description="Enter the address on your account. We send a code that works once and expires after fifteen minutes."
      />
      <Rule />

      {failure && (
        <AuthAlert
          title={failure}
          body="Check the email address and try again."
        />
      )}

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-[18px]"
        >
          <TextField<ForgotPasswordValues>
            name="email"
            label="Email address"
            type="email"
            placeholder="you@school.ng"
            hint="The address the school has on file"
            required
          />
          <Button
            type="submit"
            pending={isSubmitting}
            className="w-full justify-start"
          >
            {isSubmitting ? 'Sending the code…' : 'Send the reset code'}
          </Button>
        </form>
      </FormProvider>

      <Rule />
      <div className="text-[12.5px] leading-relaxed text-muted-foreground">
        No email arrives if the address is not on an account. The school office
        can tell you which address is registered.
      </div>
    </>
  )
}
