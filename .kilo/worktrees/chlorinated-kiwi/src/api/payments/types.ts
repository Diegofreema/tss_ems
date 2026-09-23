/**
 * Card and bank payment through Credo.
 *
 * The flow is four calls: ask the gateway what mode it is in, initialise a
 * payment against one invoice, send the payer to Credo's own page, and settle
 * the invoice when they come back.
 *
 * **The amount is never sent by the browser.** `initialise` takes an invoice
 * id and the server reads the amount off the invoice, and `verify` refuses
 * with 402 anything that does not cover it. So there is no part payment here
 * and no field to type a figure into — which is the point.
 */

/**
 * Which gateway the school is pointed at.
 *
 * Read only so a demo payment can be badged as one: keys are never returned,
 * and the two `_present` flags are how the school finds out a key is missing
 * without the key being exposed to find out with.
 */
export type GatewayConfig = {
  /** `demo` or `live`. */
  mode: string
  live: boolean
  public_key_present: boolean
  secret_key_present: boolean
}

export type InitialisePaymentBody = {
  invoice_id: number
  /**
   * Where Credo returns the payer, with `?reference=` appended. Optional, and
   * refused with 422 unless the origin is one the API lists — so a deployment
   * on a new domain has to be allowed there before this works.
   */
  callback_url?: string
}

/** Where to send the payer, and the reference everything after is keyed on. */
export type InitialisedPayment = {
  authorization_url: string
  reference: string
}

/**
 * Where a payment has got to.
 *
 * `initialized` means the payer has not come back yet; `pending` means Credo
 * has it and has not settled it. Only `paid` and `failed` are final.
 */
export type PaymentState = 'initialized' | 'pending' | 'paid' | 'failed'

export type PaymentRecord = {
  /** Absent on the verify answer, which was asked by reference already. */
  reference?: string
  status: PaymentState
  amount: number
  invoice_id: number
  /**
   * True where an earlier call had already settled this invoice, so no second
   * receipt was sent and no second paylog written. The contract shows it
   * beside `data` rather than on it, in which case the envelope drops it and
   * this reads undefined — which is why nothing depends on it being there.
   */
  already?: boolean
}
