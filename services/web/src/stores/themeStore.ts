import { create } from 'zustand'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'aquerii:theme'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function applyTheme(theme: Theme) {
  try { document.documentElement.classList.toggle('light-theme', theme === 'light') } catch {}
}

applyTheme(getInitialTheme())

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    set({ theme })
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
    applyTheme(theme)
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))
