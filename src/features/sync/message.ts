export type SyncCopy = {
  online: boolean
  /** Whether work written now survives a reload. */
  durable: boolean
  /** Written down, not yet sent. */
  waiting: number
  /** Refused, or in flight when the tab died. Needs a person. */
  needsAnswer: number
}

const count = (amount: number, one: string, many: string) =>
  `${amount} ${amount === 1 ? one : many}`

/**
 * What the bar under the header says.
 *
 * Pure, and tested, because this is the app's one promise about somebody's
 * work and it has been broken before: the bar used to tell every reader that
 * what they typed would send when the connection returned, at a time when
 * nothing was keeping it. Each sentence here has to be true in the state that
 * produces it — including the unhappy one, where the browser will not store
 * anything and the person is about to close the tab.
 */
export function syncMessage({ online, durable, waiting, needsAnswer }: SyncCopy): string {
  if (needsAnswer > 0) {
    return `${count(needsAnswer, 'change needs', 'changes need')} your attention before ${
      needsAnswer === 1 ? 'it can' : 'they can'
    } be saved to the school.`
  }

  if (!online && !durable) {
    return waiting > 0
      ? `You are offline, and this browser cannot save work between visits. Keep this tab open — ${count(
          waiting,
          'change is',
          'changes are',
        )} waiting to send.`
      : 'You are offline, and this browser cannot save work between visits. Anything you type will be lost if you close this tab.'
  }

  if (!online) {
    return waiting > 0
      ? `You are offline. ${count(
          waiting,
          'change is',
          'changes are',
        )} saved on this device and will send when the connection returns.`
      : 'You are offline. Your work is saved on this device and will send when the connection returns.'
  }

  // Not "to the school": at this point the device has it and is trying, and
  // where the trying is what has gone wrong — a refusal, a backoff, a link
  // that keeps dropping — naming the school reads as a delivery this sentence
  // cannot promise.
  return `${count(waiting, 'change is', 'changes are')} still being sent.`
}

/**
 * Which surface speaks: nothing, the header chip, or the full bar.
 *
 * Offline is a normal state for this app, not an incident — the schools it
 * runs in lose the connection every day, and a full-width bar shouting it all
 * day taught readers to stop reading it. So the bar is kept for the moments
 * that need a person, being offline on a device that keeps everything is a
 * chip in the header — the app knows, carry on — and a healthy queue doing
 * its job in the background says nothing at all: the write's own toast
 * already spoke, and a bar flashing for the second a save takes is what made
 * background sending look like something a person had to attend to.
 */
export type SyncSurface =
  | { kind: 'quiet' }
  /** The slim header chip: a state worth acknowledging, not announcing. */
  | { kind: 'chip'; label: string }
  /** The full bar, and whether it offers "Send now". */
  | { kind: 'bar'; sendNow: boolean }

export function syncSurface({
  online,
  durable,
  waiting,
  needsAnswer,
  stuck,
}: SyncCopy & { stuck: boolean }): SyncSurface {
  // A person is needed. Everything else waits behind this.
  if (needsAnswer > 0) return { kind: 'bar', sendNow: false }

  // Work typed now dies with the tab: the one warning that prevents loss,
  // and the one offline state still worth a whole bar.
  if (!online && !durable) return { kind: 'bar', sendNow: false }

  if (!online) {
    return {
      kind: 'chip',
      label: waiting > 0 ? `Offline · ${count(waiting, 'saved', 'saved')}` : 'Offline',
    }
  }

  // Online with work the queue cannot move on its own initiative — see
  // `queueStuck`. The one state where "Send now" does anything, so the one
  // state the button is shown in.
  if (waiting > 0 && stuck) return { kind: 'bar', sendNow: true }

  return { kind: 'quiet' }
}

/**
 * Whether the queue is stuck rather than merely busy.
 *
 * `attempts` moves only when a send has actually failed — a healthy first
 * attempt keeps it at zero — so a queued op carrying attempts is one serving
 * out a backoff. The auth pause is the queue deciding not to try at all until
 * somebody signs in. Both can sit for a while on the timer's initiative,
 * which is exactly what "Send now" exists to override; an op merely in
 * flight, or queued behind one, is the background doing its job.
 */
export function queueStuck(
  ops: readonly { state: string; attempts: number }[],
  pausedForAuth: boolean,
): boolean {
  return pausedForAuth || ops.some((op) => op.state === 'queued' && op.attempts > 0)
}
