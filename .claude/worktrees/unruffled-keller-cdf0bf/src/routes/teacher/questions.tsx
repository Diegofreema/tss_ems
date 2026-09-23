import { createFileRoute } from '@tanstack/react-router'
import { QuestionsPage } from '@/portals/teacher/features/assignments/questions-page'

export const Route = createFileRoute('/teacher/questions')({
  staticData: {
    title: 'Write the questions',
    crumb: 'Assessment · Set assignments',
    crumbTo: '/teacher/assignments',
  },
  component: QuestionsPage,
})
