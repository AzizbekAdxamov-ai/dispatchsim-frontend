import { useSyncExternalStore } from 'react'
import { DRAWER_QUERY, WIDE_QUERY } from '../components/layout/breakpoints'

// 'wide' | 'rail' | 'drawer', kept in step with the two media queries the
// CSS uses (breakpoints.js). useSyncExternalStore so the first paint is
// already right and a resize never renders two modes at once.
function subscribe(onChange) {
  const lists = [window.matchMedia(WIDE_QUERY), window.matchMedia(DRAWER_QUERY)]
  for (const l of lists) l.addEventListener('change', onChange)
  return () => {
    for (const l of lists) l.removeEventListener('change', onChange)
  }
}

function snapshot() {
  if (window.matchMedia(DRAWER_QUERY).matches) return 'drawer'
  if (window.matchMedia(WIDE_QUERY).matches) return 'wide'
  return 'rail'
}

export function useViewportMode() {
  return useSyncExternalStore(subscribe, snapshot, () => 'wide')
}
