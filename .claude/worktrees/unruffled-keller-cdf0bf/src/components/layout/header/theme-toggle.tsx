import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppearanceStore } from '@/stores/appearance.store'

export function ThemeToggle() {
  const theme = useAppearanceStore((state) => state.theme)
  const toggleTheme = useAppearanceStore((state) => state.toggleTheme)
  const label = theme === 'dark' ? 'Switch to light' : 'Switch to dark'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className="size-9"
    >
      <Icon className="size-4" strokeWidth={1.9} />
    </Button>
  )
}
