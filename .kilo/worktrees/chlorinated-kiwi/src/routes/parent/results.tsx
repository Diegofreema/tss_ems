import { createFileRoute } from '@tanstack/react-router'
import { ResultsPage } from '@/portals/parent/features/results/results-page'
import { useSelectedChild } from '@/portals/parent/parent.store'

export const Route = createFileRoute('/parent/results')({
  staticData: { title: 'Results', crumb: 'My children' },
  component: Results,
})

function Results() {
  return <ResultsPage child={useSelectedChild()} />
}
