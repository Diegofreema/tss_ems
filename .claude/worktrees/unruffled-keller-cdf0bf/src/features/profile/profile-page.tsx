import { useNavigate } from '@tanstack/react-router'
import { useLogoutEverywhere } from '@/api/auth/hooks'
import { SectionHeading } from '@/components/common/section-heading'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { DetailRows } from '@/features/auth/components/detail-rows'
import { useSession } from '@/features/auth/session'
import { AppearancePicker } from './components/appearance-picker'
import { ChangePassword } from './components/change-password'
import { ContactPrefs } from './components/contact-prefs'
import {
  PersonalDetails,
  type ProfileValues,
} from './components/personal-details'
import { ProfileIdentity } from './components/profile-identity'
import { useRecordForm } from '@/hooks/use-record-form'
import { profileFromAccount } from './from-account'
import { profileSchema } from './schema'
import type { ProfileConfig, ProfileSave } from './types'

/**
 * The account page, shared by all four portals. The form lives here rather than
 * in `PersonalDetails` so the heading can show the name as it is being typed.
 *
 * What saving means is the portal's, since each role's record is a different
 * endpoint — this only reads the config and collects the form.
 */
export function ProfilePage({
  config: portal,
  save,
}: {
  config: ProfileConfig
  save?: ProfileSave
}) {
  const navigate = useNavigate()
  const { account } = useSession()
  // The portal defines the page; the account fills in whoever is reading it —
  // unless the portal already read that person's own record, which says more
  // than the session does.
  const config =
    account && !portal.fromRecord ? profileFromAccount(portal, account) : portal
  const logout = useLogoutEverywhere()
  const form = useRecordForm<ProfileValues>(
    profileSchema(config.fields),
    config.values,
  )

  const edited = form.watch('fullname')
  const name =
    typeof edited === 'string' && edited ? edited : config.values.fullname

  return (
    <div className="max-w-[940px]">
      <ProfileIdentity
        initials={config.initials}
        name={name}
        meta={config.meta}
      />
      <Rule />

      <div className="grid items-start gap-[34px] lg:grid-cols-[1.4fr_1fr]">
        <section>
          <PersonalDetails
            form={form}
            note={config.note}
            fields={config.fields}
            values={config.values}
            saving={save?.pending}
            onSave={save?.save}
          />
          <ChangePassword />
        </section>

        <aside>
          <SectionHeading className="mb-3.5">Sign-in</SectionHeading>
          <DetailRows rows={config.account} className="mt-0" />

          <SectionHeading className="mt-7 mb-3.5">
            How the school reaches you
          </SectionHeading>
          <ContactPrefs prefs={config.prefs} />

          <SectionHeading className="mt-7 mb-3.5">Appearance</SectionHeading>
          <AppearancePicker />

          <SectionHeading className="mt-7 mb-3.5">Session</SectionHeading>
          {/* The API revokes every token for the account at once, this one
              included, so the page it lands on has to be sign-in. */}
          <Button
            variant="outline"
            className="w-full justify-start"
            pending={logout.isPending}
            onClick={async () => {
              await logout.mutateAsync().catch(() => undefined)
              await navigate({ to: '/sign-in' })
            }}
          >
            Sign out my other devices
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {config.sessionNote}
          </p>
        </aside>
      </div>
    </div>
  )
}
