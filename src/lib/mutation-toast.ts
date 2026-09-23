/**
 * What a write says when it succeeds, and whether the screen would rather say
 * it itself.
 *
 * Its own module rather than living beside the mutation cache that raises it,
 * because the local-first queue raises the same sentence for writes that never
 * touch react-query — and the queue's pure logic is covered by `node --test`,
 * which cannot follow an import into browser code.
 */
export type MutationToast = {
  /** Shown on success, written as the thing that just happened. */
  success: string
  /** Set when the screen reports the failure itself — the sign-in alert, say. */
  ownsError?: boolean
  /**
   * Say nothing when this one lands.
   *
   * A deliberate exception to "every write is owed exactly one sentence", and
   * the rule it is an exception to is the reason it has to be asked for out
   * loud rather than achieved by leaving `success` empty.
   *
   * It is for a write **the reader did not make**: the app filing marks off an
   * assignment's own answer key, where a class of thirty is thirty writes and
   * thirty toasts saying the same thing about arithmetic nobody disputed. The
   * screen that causes it says the one sentence that is worth saying.
   *
   * Only the success and held sentences are silenced. A write that *fails*
   * still speaks, through `announceFailed`, because by then it is news.
   */
  silent?: boolean
}
