/**
 * What the confirm dialog says before a sign-out.
 *
 * This is not a politeness. Signing out of this app is destructive in a way
 * signing out of most apps is not: `endSession` wipes the device's database —
 * the school's records, and **the outbox with them**. Work written in a
 * classroom with no signal and not yet sent is deleted by the click, and the
 * button that does it sits in the rail under every page, one row below
 * Settings.
 *
 * So the dialog's job is to say which of those two things is about to happen,
 * and the unsent-work sentence is the whole reason the dialog is worth having.
 */

export type PendingWork = {
  /** Written down, not yet sent. */
  waiting: number
  /** Refused, or in flight when the tab died. Needs a person. */
  needsAnswer: number
}

const count = (amount: number, one: string, many: string) =>
  `${amount} ${amount === 1 ? one : many}`

/** Whether there is anything on this device the school has not taken. */
export function hasUnsentWork({ waiting, needsAnswer }: PendingWork): boolean {
  return waiting + needsAnswer > 0
}

/**
 * The dialog's body.
 *
 * `everywhere` is the profile page's button, which ends every session this
 * account has open — including the one reading the dialog, which its own
 * label does not say.
 */
export function signOutBody(pending: PendingWork, everywhere = false): string {
  const unsent = pending.waiting + pending.needsAnswer

  if (unsent > 0) {
    return `${count(
      unsent,
      'change is',
      'changes are',
    )} saved on this device and ${unsent === 1 ? 'has' : 'have'} not reached the school. Signing out clears this device, so ${
      unsent === 1 ? 'it' : 'they'
    } will be lost. Send ${unsent === 1 ? 'it' : 'them'} first if you can.`
  }

  return everywhere
    ? 'This ends every session on this account, including this one, and clears the school’s records from this device. Everyone signed in as you will have to sign in again.'
    : 'This clears the school’s records from this device, so the next person to open the browser finds nothing. You will need your password to sign back in.'
}

/** The button that does it. Named after the act, not after "OK". */
export function signOutCta(everywhere = false): string {
  return everywhere ? 'Sign out everywhere' : 'Sign out'
}
