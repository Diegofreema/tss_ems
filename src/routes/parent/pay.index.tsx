import { createFileRoute } from '@tanstack/react-router'
import { PayPage } from '@/portals/parent/features/pay/pay-page'

export const Route = createFileRoute('/parent/pay/')({
  staticData: { title: 'Pay fees', crumb: 'Finance' },
  component: PayPage,
})
