import { createFileRoute, redirect } from '@tanstack/react-router'

/*
 * There is no front page: the first thing a visitor sees is the sign-in form.
 *
 * Somebody signed in is sent on from there to their own portal by the sign-in
 * route's own guard, so `/` is one answer for everybody — a link back to the
 * root inside the app, an old bookmark to the landing page that used to be
 * here, and the address typed bare. A family that is not a user yet finds
 * Apply on that form.
 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/sign-in', replace: true })
  },
})
