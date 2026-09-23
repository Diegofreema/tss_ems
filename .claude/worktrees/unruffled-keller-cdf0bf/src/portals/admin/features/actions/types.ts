import type { FieldSpec } from '@/features/collections/types.ts'

export type PickerItem = {
  key: string
  label: string
  meta: string
  /** Pupils in the arm — the allocate flow bills every one of them. */
  count: number
  /**
   * A stored file behind this row. Set by review, where the reader needs to
   * open the document before ticking that they have seen it.
   */
  file?: string
}

export type PickerSpec = {
  title: string
  items: PickerItem[]
  note: string
  /** Ticked as the flow opens; review arrives with the documents on file. */
  preselected?: string[]
  /** Set when nothing can be raised for an empty selection. */
  requiredMessage?: string
}

/**
 * A field with the value the flow opens on, and the answer that makes it
 * matter — a class is required to admit an applicant and meaningless to
 * decline one, which a flat `required` cannot say.
 */
export type ActionField = FieldSpec & {
  value?: string | Date
  requiredWhen?: { field: string; is: string }
}

/**
 * One guided flow: what it is for, what it needs picked, what it asks, and
 * what it says when it is done.
 */
export type ActionDef = {
  kicker: string
  title: string
  description: string
  summary: { label: string; value: string }[]
  picker?: PickerSpec
  fields: ActionField[]
  cta: string
  footnote: string
  /** Set by allocate: the per-pupil amount behind the running total. */
  unitAmount?: number
  /**
   * Figures recomputed from the answers as they are typed, shown beside the
   * summary. A picker's running total comes off `unitAmount`; this is for a
   * flow whose arithmetic is over its fields — the discount on a payment
   * decides what is actually collected, and that has to be on screen before
   * the button is pressed rather than only in the confirm.
   */
  tally?: (values: Record<string, unknown>) => { label: string; value: string }[]
  /** The toast, given how many items were picked. */
  done: (picked: number) => string
  /**
   * Runs the flow against the API. A flow without one keeps the prototype's
   * toast. Returning failures holds the page open with them listed, since a
   * partial move is not something to navigate away from.
   */
  run?: (values: Record<string, unknown>) => Promise<ActionOutcome>
  /**
   * Asked before the flow runs. Set where pressing the button commits money
   * against real families and cannot be taken back from this screen.
   *
   * The running total is passed where the flow has a picker to compute one;
   * taking a payment settles one invoice and has none, so it is optional. The
   * answers are passed too, and awaited, so a confirm can name what was picked
   * — the dialog is the last chance to notice the wrong invoice.
   */
  confirm?: (
    total?: { pupils: number; amount: number },
    values?: Record<string, unknown>,
  ) => ActionConfirm | Promise<ActionConfirm>
}

/** What the API did, as the flow page reports it. */
export type ActionOutcome = {
  message: string
  /** One line per pupil the API would not move, with its reason. */
  failures?: string[]
}

/**
 * What the confirm dialog is told, minus how to run it. Spelled out rather
 * than imported so this module stays free of JSX and its logic stays testable
 * under the plain node runner; the call site checks it against `ConfirmRequest`.
 */
export type ActionConfirm = {
  title: string
  body: string
  subject: string
  cta: string
  cancel: string
}
