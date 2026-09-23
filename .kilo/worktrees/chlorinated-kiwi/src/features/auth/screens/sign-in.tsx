import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { useLogin } from '@/api/auth/hooks'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useRecordForm } from '@/hooks/use-record-form'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { endSession } from '@/stores/session.store'
import { useAuthStore } from '../auth.store'
import { AuthAlert } from '../components/auth-alert'
import { authButton } from '../components/auth-button'
import { AuthField, AuthPasswordField } from '../components/auth-field'
import { AuthHeading } from '../components/auth-heading'
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
  const [visible, setVisible] = useState(false)
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
        title="Welcome Back"
        description="Kindly fill in your details to Login to your account"
      />

      {alert && <AuthAlert title={alert.title} body={alert.body} />}

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="mt-(--auth-gap) flex flex-col gap-(--auth-gap)"
        >
          <AuthField<SignInValues>
            name="username"
            label="Email Address"
            type="email"
            placeholder="Enter email address"
            icon={Mail}
            autoComplete="username"
          />

          <AuthPasswordField<SignInValues>
            name="password"
            label="Password"
            placeholder="Enter Password"
            icon={Lock}
            autoComplete="current-password"
            visible={visible}
            onToggle={() => setVisible((previous) => !previous)}
          />

          <div className="-mt-2 flex flex-wrap items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-3 text-base">
              <Checkbox
                checked={form.watch('remember')}
                onCheckedChange={(checked) =>
                  form.setValue('remember', checked === true)
                }
                className="size-5 rounded-[4px] border-ui-hint/70 data-checked:border-ui-blue data-checked:bg-ui-blue"
              />
              <span>Keep me signed in on this device</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-base text-ui-blue-ink hover:underline"
            >
              Forgot password
            </Link>
          </div>

          <Button type="submit" pending={isSubmitting} className={`mt-3 ${authButton}`}>
            {isSubmitting ? 'Signing you in…' : 'Login'}
          </Button>
        </form>
      </FormProvider>

      <p className="mt-(--auth-tail) text-[13px] leading-relaxed text-ui-muted">
        Accounts are created by the school office. If you are new and have no
        password yet, open the invitation email and use the link in it, or ask
        the office to send it again.
      </p>
    </>
  )
}
