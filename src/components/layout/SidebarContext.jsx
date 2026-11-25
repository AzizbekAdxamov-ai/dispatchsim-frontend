import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useViewportMode } from '../../hooks/useViewportMode'
// Page frame rules shared by every shell (.app / .content).
import './Shell.css'

// What the shell shares between its Topbar (hamburger) and its Sidebar
// (rail, drawer): the viewport mode and whether the drawer is open.
// The drawer is never open in 'wide' mode, closes when the route changes,
// and locks page scroll while it is up.
const SidebarContext = createContext({
  mode: 'wide',
  drawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
})

const LOCK_CLASS = 'ds-scroll-locked'

export function SidebarProvider({ children }) {
  const mode = useViewportMode()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  // Adjusted while rendering (React's own pattern for state derived from
  // props): a new route, or growing to wide, closes the drawer in the same
  // render, so no frame of the new page is drawn under an open drawer.
  const [seenPath, setSeenPath] = useState(pathname)
  if (seenPath !== pathname) {
    setSeenPath(pathname)
    setOpen(false)
  }
  if (mode === 'wide' && open) setOpen(false)
  const drawerOpen = open && mode !== 'wide'

  useEffect(() => {
    if (!drawerOpen) return undefined
    document.documentElement.classList.add(LOCK_CLASS)
    return () => document.documentElement.classList.remove(LOCK_CLASS)
  }, [drawerOpen])

  const openDrawer = useCallback(() => setOpen(true), [])
  const closeDrawer = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ mode, drawerOpen, openDrawer, closeDrawer }),
    [mode, drawerOpen, openDrawer, closeDrawer],
  )
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs next to its provider
export function useSidebar() {
  return useContext(SidebarContext)
}
