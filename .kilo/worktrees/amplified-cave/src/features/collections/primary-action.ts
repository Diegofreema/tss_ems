import type { CollectionDef, CollectionRoutes, FlowSpec } from './types.ts'

/**
 * Some primary actions hand the reader a file rather than opening a form —
 * "Export CSV", "Download result sheet". The design keys this off the verb, so
 * a collection declares the label and the behaviour follows.
 */
export function isFileAction(action: string): boolean {
  return /^(Export|Download)\b/.test(action)
}

export function fileActionToast(action: string): string {
  return `${action} — file will download`
}

/**
 * `none` shows no button at all. `placeholder` is the prototype's unwired
 * one — the student and parent portals publish no create route and lean on
 * it — and the two are spelled apart so no component has to re-derive which
 * of them it is looking at.
 */
export type PrimaryActionKind =
  | 'file'
  | 'flow'
  | 'create'
  | 'link'
  | 'placeholder'
  | 'none'

/**
 * What a list's primary button does. The list renders from this and the create
 * route refuses anything but `create`, so a collection can never show a button
 * that skips the create form while still leaving that form reachable by URL.
 */
export function primaryActionKind(
  definition: CollectionDef,
  routes: CollectionRoutes,
  flows?: readonly FlowSpec[],
): PrimaryActionKind {
  // Before everything: a destination the collection named itself. Read-only
  // does not suppress it, because a link is not a way of adding to the list —
  // the counter queue cannot be written to and still owes its report a button.
  // The rules below are inferences from a label or a route; this one is not.
  if (definition.actionTo) return 'link'
  // A flow the collection offers from its own list stands whether or not the
  // records themselves can be edited: `readonly` says nothing arrives through
  // the create form, and a guided flow is not that form — the lending register
  // cannot be typed into and still issues the books that fill it.
  if (routes.flow && flows?.some((flow) => flow.fromList && (flow.allowed?.() ?? true)))
    return 'flow'
  // A collection nobody can add to has no primary action, whatever its label
  // would otherwise have done.
  if (definition.readonly) return 'none'
  if (isFileAction(definition.action)) return 'file'
  if (routes.create) return 'create'
  return 'placeholder'
}
