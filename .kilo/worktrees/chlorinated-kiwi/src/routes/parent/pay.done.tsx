import { createFileRoute } from '@tanstack/react-router'
import { PayDonePage } from '@/portals/parent/features/pay/pay-done'

export const Route = createFileRoute('/parent/pay/done')({
  staticData: { title: 'Payment', crumb: 'Finance' },
  component: PayDonePage,
})
