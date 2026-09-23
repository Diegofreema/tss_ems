import { createFileRoute } from '@tanstack/react-router'
import { adminsService } from '@/api/admins/service'
import { ProfilePage } from '@/features/profile/profile-page'
import { adminProfile } from '@/portals/admin/profile'
import { useAdminProfileSave } from '@/portals/admin/profile-save'

export const Route = createFileRoute('/admin/profile')({
  staticData: { title: 'My profile', crumb: 'My account' },
  // The whole office record in one call — the privileges, the class and the
  // login with its role expanded, none of which `/users/me` carries. A refusal
  // leaves the page on what the session knows rather than on an error: this is
  // the page someone lands on to change their own password.
  loader: () => adminsService.profile().catch(() => undefined),
  component: Profile,
})

function Profile() {
  const save = useAdminProfileSave()

  return <ProfilePage config={adminProfile(Route.useLoaderData())} save={save} />
}
