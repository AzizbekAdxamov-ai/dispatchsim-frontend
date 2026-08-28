import { createContext, useContext, useEffect, useState } from 'react'
import './tokens.css'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'dispatchsim.theme'

// Theme is a device preference, not identity, so it stays in localStorage —
// but ThemeProvider wraps the entire app, so any storage failure here
// (private/incognito mode, quota, disabled storage) must not throw, or the
// whole app renders a blank screen instead of just losing the saved theme.
function loadTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'dark'
  } catch {
    return 'dark'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(loadTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore storage failures
    }
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
