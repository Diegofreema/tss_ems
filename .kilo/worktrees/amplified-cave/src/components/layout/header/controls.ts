/**
 * The header's round controls. One class, because the bell, the messages door
 * and the theme switch are the same object with different glyphs, and three
 * copies of it drifted apart the first time one of them was touched.
 */
export const headerControl =
  'relative size-10 flex-none rounded-full border-transparent bg-ui-field text-foreground hover:bg-neutral-200 dark:bg-neutral-200/60'
