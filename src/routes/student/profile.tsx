import { createFileRoute } from '@tanstack/react-router'
import { mySchoolingService } from '@/api/my-schooling/service'
import { ProfilePage } from '@/features/profile/profile-page'
import { studentProfile } from '@/portals/student/profile'
import { useStudentProfileSave } from '@/portals/student/profile-save'

export const Route = createFileRoute('/student/profile')({
  staticData: { title: 'My profile', crumb: 'My account' },
  // The whole student record in one call — the admission number, the arm and the
  // login, none of which the session carries. A refusal leaves the page on
  // what the session knows rather than on an error: this is the page someone
  // lands on to change their own password.
  loader: () => mySchoolingService.record().catch(() => undefined),
  component: Profile,
})

function Profile() {
  const student = Route.useLoaderData()
  const save = useStudentProfileSave()

  // Nothing to save back to where the record never answered: the page falls
  // back to the session, which holds no student record to correct.
  return <ProfilePage config={studentProfile(student)} save={student && save} />
}
