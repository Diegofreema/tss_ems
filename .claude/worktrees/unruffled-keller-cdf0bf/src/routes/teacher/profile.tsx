import { createFileRoute } from '@tanstack/react-router'
import { teachingService } from '@/api/teaching/service'
import { ProfilePage } from '@/features/profile/profile-page'
import { teacherProfile } from '@/portals/teacher/profile'
import { useTeacherProfileSave } from '@/portals/teacher/profile-save'

export const Route = createFileRoute('/teacher/profile')({
  staticData: { title: 'My profile', crumb: 'My account' },
  // The whole teaching record in one call — the class, the subjects and the
  // arms taken, none of which the session carries. A refusal leaves the page
  // on what the session knows rather than on an error: this is the page
  // someone lands on to change their own password.
  loader: () => teachingService.profile().catch(() => undefined),
  component: Profile,
})

function Profile() {
  const profile = Route.useLoaderData()
  const save = useTeacherProfileSave()

  // Nothing to save back to where the record never answered: the page falls
  // back to the session, which holds no teaching record to correct.
  return <ProfilePage config={teacherProfile(profile)} save={profile && save} />
}
