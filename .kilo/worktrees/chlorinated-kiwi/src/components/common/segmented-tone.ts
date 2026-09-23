/**
 * What a chosen segmented option is filled with.
 *
 * Its own module rather than a line in `segmented-control.tsx` for one
 * concrete reason: the teacher's `register.ts` decides a mark's tone, and that
 * file is a pure module under `node --test`, which reads relative `.ts`
 * imports and cannot parse JSX. A type living in a `.tsx` would have put a
 * component file on the test's import path.
 *
 * `accent` is the brand blue every segmented control in the app had, and stays
 * the default — a control that says nothing about tone looks exactly as it
 * did. The rest exist because the attendance register has to tell four marks
 * apart at a glance.
 */
export type SegmentedTone = 'accent' | 'good' | 'bad' | 'warn'

/** Each tone's fill, white text throughout: all four clear 4.5:1 in both themes. */
export const SEGMENTED_FILL: Record<SegmentedTone, string> = {
  accent: 'bg-brand text-white',
  good: 'bg-success text-white',
  bad: 'bg-danger text-white',
  warn: 'bg-warn text-white',
}
