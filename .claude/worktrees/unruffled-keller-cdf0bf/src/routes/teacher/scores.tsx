import { createFileRoute } from '@tanstack/react-router'
import { ScoresPage } from '@/portals/teacher/features/scores/scores-page'

export const Route = createFileRoute('/teacher/scores')({
  staticData: { title: 'Enter scores', crumb: 'Assessment' },
  component: ScoresPage,
})
