import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { useLogin } from '@/api/auth/hooks'
import { TextField } from '@/components/form/text-field'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useRecordForm } from '@/hooks/use-record-form'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { endSession } from '@/stores/session.store'
import { useAuthStore } from '../auth.store'
import { AuthAlert } from '../components/auth-alert'
import { AuthHeading } from '../components/auth-heading'
import { PasswordInput } from '../components/password-input'
import {
  DISABLED_BODY,
  DISABLED_TITLE,
  isDisabled,
  portalFor,
  roleForAccount,
} from '../role'
import { loadAccount } from '../session'
import { signInSchema, type SignInValues } from '../schemas'

/** What the alert says. Only a disabled account replaces the body. */
type Failure = { title: string; body: string }

const WRONG_DETAILS_BODY =
  'Check the email and password, then try again. Five wrong tries locks the account for fifteen minutes.'

const DISABLED_FAILURE: Failure = { title: DISABLED_TITLE, body: DISABLED_BODY }

export function SignInScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const login = useLogin()
  const identify = useAuthStore((state) => state.identify)
  // Set when a guard turned a switched-off sign-in away, so landing here from
  // a live token says why rather than showing a blank form.
  const turnedAway = useAuthStore((state) => state.disabled)
  const clearDisabled = useAuthStore((state) => state.clearDisabled)
  const [failure, setFailure] = useState<Failure | null>(null)
  const alert = failure ?? (turnedAway ? DISABLED_FAILURE : null)

  const form = useRecordForm<SignInValues>(signInSchema, {
    username: '',
    password: '',
    remember: false,
  })

  const onSubmit = async (values: SignInValues) => {
    setFailure(null)
    clearDisabled()
    try {
      const signedIn = await login.mutateAsync({
        username: values.username,
        password: values.password,
        remember: values.remember,
      })

      // The password was right, but the office has switched this sign-in off.
      // Read off the login answer rather than waiting for `me`, and the
      // session it just stored — token included — is dropped again here.
      if (isDisabled(signedIn)) {
        endSession(queryClient)
        setFailure(DISABLED_FAILURE)
        return
      }

      // The token and the account from the login answer are both stored by
      // now, so this carries the token and is checked against the account.
      // It is still read rather than skipped: `me` is what the portal guard
      // reads on every reload afterwards, and whatever it can be trusted for
      // — a role renamed since, a profile edited — is fresher here.
      const account = await loadAccount(queryClient)
      if (!account) {
        setFailure({
          title: 'Your password was accepted but the account would not load. Try again.',
          body: WRONG_DETAILS_BODY,
        })
        return
      }

      const role = roleForAccount(account)
      identify(account.user.username, role)

      await navigate({ to: role ? portalFor(role).to : '/wrong-portal' })
    } catch (error) {
      setFailure({ title: errorMessage(error, OFFLINE_MESSAGE), body: WRONG_DETAILS_BODY })
    }
  }

  const { isSubmitting } = form.formState

  return (
    <>
      <AuthHeading
        kicker="Sign in"
        title="Welcome back"
        description="Sign in with the email address the school has on file to reach your account."
      />
      <Rule />

      {alert && <AuthAlert title={alert.title} body={alert.body} />}

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4.5"
        >
          <TextField<SignInValues>
            name="username"
            label="Email address"
            placeholder="you@school.ng"
            hint="The address the school has on file"
            required
          />

          <PasswordInput<SignInValues>
            name="password"
            label="Password"
            placeholder="Your password"
            hint="Six characters or more"
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px]">
              <Checkbox
                checked={form.watch('remember')}
                onCheckedChange={(checked) =>
                  form.setValue('remember', checked === true)
                }
              />
              <span>Keep me signed in on this device</span>
            </label>
            <Button asChild variant="ghost" className="px-0 text-brand">
              <Link to="/forgot-password">Forgotten password?</Link>
            </Button>
          </div>

          <Button
            type="submit"
            pending={isSubmitting}
            className="w-fit justify-start"
          >
            {isSubmitting ? 'Signing you in…' : 'Sign in'}
          </Button>
        </form>
      </FormProvider>

      <Rule />
      <div className="text-[12.5px] leading-relaxed text-muted-foreground">
        Accounts are created by the school office. If you are new and have no
        password yet, open the invitation email and use the link in it, or ask
        the office to send it again.
      </div>
    </>
  )
}
