import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'ems-theme'

/** The design's `motion` prop: 0–10, where 6 is the intended default and 0 disables animation. */
export const DEFAULT_MOTION = 6

type AppearanceState = {
  theme: Theme
  motion: number
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setMotion: (motion: number) => void
}

export function readStoredTheme(): Theme {
  return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Both values are written to the document so CSS alone can react to them. */
function applyTheme(theme: Theme) {
  document.documentElement.dataset.emsTheme = theme
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

function applyMotion(motion: number) {
  document.documentElement.style.setProperty(
    '--ems-motion',
    String(motion / DEFAULT_MOTION),
  )
}

export const useAppearanceStore = create<AppearanceState>()((set, get) => ({
  theme: readStoredTheme(),
  motion: prefersReducedMotion() ? 0 : DEFAULT_MOTION,

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },

  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),

  setMotion: (motion) => {
    applyMotion(motion)
    set({ motion })
  },
}))

// Sync the document with the initial store values on load.
applyTheme(useAppearanceStore.getState().theme)
applyMotion(useAppearanceStore.getState().motion)
