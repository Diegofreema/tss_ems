import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/features/profile/profile-page'
import { parentProfile } from '@/portals/parent/profile'

export const Route = createFileRoute('/parent/profile')({
  staticData: { title: 'My profile', crumb: 'My account' },
  component: () => <ProfilePage config={parentProfile} />,
})
