import { createFileRoute, redirect } from '@tanstack/react-router'
import { installedApp } from '@/features/auth/installed'
import { LandingPage } from '@/features/landing/landing-page'

export const Route = createFileRoute('/')({
  /*
   * The installed app has no shopfront.
   *
   * Somebody who tapped the icon on their home screen is not deciding whether
   * to use the portal — they are trying to reach a register, a result or a
   * bill, and a page of prose with the Sign in button at the end of it is in
   * the way. The manifest sends new installs straight to the form; this is
   * what does the same for every phone the app is already on, whose
   * `start_url` was fixed at install time and cannot be changed from here.
   *
   * It is not only the first screen: a link back to `/` inside the app lands
   * here too, and the answer is the same either way. Signed in, the sign-in
   * route sends them on to their own portal, so the redirect costs a tap of
   * nothing and never shows a form to somebody who does not need one.
   */
  beforeLoad: () => {
    if (installedApp()) throw redirect({ to: '/sign-in' })
  },
  component: LandingPage,
})
