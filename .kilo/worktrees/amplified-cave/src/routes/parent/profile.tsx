import { createFileRoute } from '@tanstack/react-router'
import { myFamilyService } from '@/api/parents/service'
import { ProfilePage } from '@/features/profile/profile-page'
import { parentProfile } from '@/portals/parent/profile'

export const Route = createFileRoute('/parent/profile')({
  staticData: { title: 'My profile', crumb: 'My account' },
  // The household record the guardian is signed in as — the parent is resolved
  // from the token, never from a path. A refusal leaves the page on what the
  // session knows rather than on an error: this is where someone lands to
  // change their own password.
  loader: () => myFamilyService.profile().catch(() => undefined),
  component: Profile,
})

function Profile() {
  return <ProfilePage config={parentProfile(Route.useLoaderData())} />
}
