import { useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import { SectionHeading } from '@/components/common/section-heading'
import { TextField } from '@/components/form/text-field'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/features/auth/components/password-input'
import { PasswordRules } from '@/features/auth/components/password-rules'
import { PasswordStrength } from '@/features/auth/components/password-strength'
import { useRecordForm } from '@/hooks/use-record-form'
import { changePasswordSchema, type ChangePasswordValues } from '../schema'

/**
 * Same rules as the reset screen, but behind the current password — the design
 * asks for it so nobody can change a password at an unlocked desk.
 */
export function ChangePassword() {
  const [visible, setVisible] = useState(false)
  const form = useRecordForm<ChangePasswordValues>(changePasswordSchema, {
    current: '',
    next: '',
    repeat: '',
  })
  const next = form.watch('next') ?? ''

  return (
    <>
      <Rule className="mt-[30px]" />
      <SectionHeading className="mb-4">Change password</SectionHeading>

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(() => {
            form.reset()
            setVisible(false)
            toast('Password updated — other devices were signed out')
          })}
          noValidate
          className="flex max-w-[420px] flex-col gap-[18px]"
        >
          <TextField<ChangePasswordValues>
            name="current"
            label="Current password"
            type="password"
            required
            placeholder="The one you signed in with"
            hint="We ask for this so nobody can change your password at your desk"
          />

          <div>
            <PasswordInput<ChangePasswordValues>
              name="next"
              label="New password"
              placeholder="At least 10 characters"
              visible={visible}
              onToggle={() => setVisible((previous) => !previous)}
            />
            <PasswordStrength password={next} />
          </div>

          <PasswordInput<ChangePasswordValues>
            name="repeat"
            label="Repeat the new password"
            placeholder="Type it again"
            hint="Both must be identical"
            visible={visible}
          />

          <PasswordRules password={next} />

          <div>
            <Button type="submit">Update password</Button>
          </div>
        </form>
      </FormProvider>
    </>
  )
}
