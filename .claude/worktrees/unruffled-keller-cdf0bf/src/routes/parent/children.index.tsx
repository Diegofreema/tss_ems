import { createFileRoute } from '@tanstack/react-router'
import { childrenFor } from '@/portals/parent/collections'
import { CollectionPage } from '@/portals/parent/components/collection-page'
import { useFamily } from '@/portals/parent/parent.store'

export const Route = createFileRoute('/parent/children/')({
  staticData: { title: 'My children', crumb: 'My children' },
  component: ChildrenList,
})

function ChildrenList() {
  return <CollectionPage definition={childrenFor(useFamily())} />
}
