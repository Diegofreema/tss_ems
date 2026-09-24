import { createFileRoute } from '@tanstack/react-router'
import { ApplyPage } from '@/features/apply/apply-page'

/**
 * The public application form. Outside `_auth` because it is not a sign-in
 * screen — it wants the width of the page, not the poster's narrow column —
 * and open to anybody, signed in or not.
 */
export const Route = createFileRoute('/apply')({
  component: ApplyPage,
})
