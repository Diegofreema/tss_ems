/**
 * The two failures the local-first layer raises itself, as opposed to the ones
 * the API raises. Both exist so that `classify` can tell them apart from a
 * refusal without matching on message text.
 */

/**
 * Thrown by a collection's fetcher instead of letting it reach the network,
 * when the browser already says there is nothing to reach. Retryable by
 * definition: the answer is "not yet", never "no".
 */
export class OfflineError extends Error {
  readonly collectionId: string

  constructor(collectionId: string) {
    super(`No connection to sync ${collectionId}.`)
    this.name = 'OfflineError'
    this.collectionId = collectionId
  }
}

/**
 * Thrown when an endpoint answers with something that is not a list of rows.
 *
 * This is not pedantry. A collection's fetcher hands back the *complete* state
 * of the collection, so a malformed answer read as "no rows" would empty the
 * device's copy of the register. Anything that is not an array is a fault, and
 * a fault must never look like an empty school.
 */
export class ShapeError extends Error {
  readonly collectionId: string

  constructor(collectionId: string) {
    super(`The server sent ${collectionId} in a shape this app cannot read.`)
    this.name = 'ShapeError'
    this.collectionId = collectionId
  }
}
