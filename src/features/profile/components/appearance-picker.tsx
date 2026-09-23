import { SegmentedControl } from '@/components/common/segmented-control'
import { type Theme, useAppearanceStore } from '@/stores/appearance.store'

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: Theme; label: string }[]

/** The same store the header toggle writes to, so the two never disagree. */
export function AppearancePicker() {
  const theme = useAppearanceStore((state) => state.theme)
  const setTheme = useAppearanceStore((state) => state.setTheme)

  return (
    <>
      <SegmentedControl
        name="appearance"
        options={THEMES}
        value={theme}
        onChange={setTheme}
      />
      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
        Kept on this device only.
      </p>
    </>
  )
}
