import { feesService } from '@/api/fees/service'
import type { FeeBody } from '@/api/fees/types'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { idUnder } from '../new-id'
import { registerHandler } from '../registry'

/**
 * The fee catalogue — what the school charges, and whether it is still charged.
 *
 * Only the catalogue. Raising an invoice against a fee and taking money for one
 * are money moving, and neither is queued: a payment accepted on a device and
 * sent later is a receipt the bursary cannot reconcile, which is a different
 * decision from the ones this queue was built for.
 */

registerHandler<FeeBody>(WRITE.createFee, {
  send: (body) => feesService.create(body),
  idempotent: false,
  newId: idUnder('fee'),
  collectionId: SET.refFees,
})

registerHandler<{ id: Id; body: FeeBody }>(WRITE.updateFee, {
  send: ({ id, body }) => feesService.update(id, body),
  idempotent: true,
  collectionId: SET.refFees,
})

/**
 * Refused with 409 while anything references the fee, and the API says what in
 * the message — which the drain treats as terminal and puts in front of a
 * person. Retiring is almost always what was meant, which is why that is the
 * button on the row.
 */
registerHandler<Id>(WRITE.removeFee, {
  send: (id) => feesService.remove(id),
  idempotent: true,
  collectionId: SET.refFees,
})

/**
 * Retiring a fee or putting it back. Idempotent: the op says which of the two
 * states the fee should end in rather than "toggle", so a replay leaves it
 * where the office meant it. What is already invoiced stays payable either way.
 */
registerHandler<{ id: Id; charged: boolean }>(WRITE.setFeeStatus, {
  send: ({ id, charged }) =>
    charged ? feesService.activate(id) : feesService.deactivate(id),
  idempotent: true,
  collectionId: SET.refFees,
})
