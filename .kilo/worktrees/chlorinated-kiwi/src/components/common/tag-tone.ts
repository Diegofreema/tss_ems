/**
 * The five tones a status chip can be painted.
 *
 * Its own module, with no JSX on it, so a pure module can name a tone without
 * dragging a component onto its import path — `status-tone.ts` decides what a
 * word *means* and is tested under `node --test`, which cannot load a `.tsx`
 * at all. The same split `segmented-tone.ts` makes, for the same reason.
 *
 * `tag.tsx` asserts its own variant table against this, so the two cannot
 * drift: a tone added here with no class beside it, or a class added there
 * under a name nothing can ask for, is a type error rather than a chip that
 * silently falls back to grey.
 */
export type TagTone = 'accent' | 'neutral' | 'outline' | 'good' | 'bad'
