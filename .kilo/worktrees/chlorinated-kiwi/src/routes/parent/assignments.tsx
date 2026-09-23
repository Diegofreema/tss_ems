import { createFileRoute } from '@tanstack/react-router'
import { assignmentsFor } from '@/portals/parent/collections'
import { CollectionPage } from '@/portals/parent/components/collection-page'
import { useSelectedChild } from '@/portals/parent/parent.store'

export const Route = createFileRoute('/parent/assignments')({
  staticData: {
    title: 'Assignments for my children',
    crumb: 'Assignments',
  },
  component: AssignmentsList,
})

function AssignmentsList() {
  return <CollectionPage definition={assignmentsFor(useSelectedChild())} />
}
