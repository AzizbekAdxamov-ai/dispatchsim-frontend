import { useSyncExternalStore } from 'react'
import { snapshot, subscribePollHealth } from './pollHealth'

// pollHealth.js as a hook.
//
// useSyncExternalStore rather than useState + useEffect because two
// components read this: the notice itself, and AppShell, which has to
// know whether the page below is --live-notice-h shorter. Two
// subscriptions settling on different renders would flash a scrollbar.
// It depends on pollHealth handing back the SAME snapshot object while
// nothing has changed -- pollHealth.js says why, and its test pins it.
//
// Its own file, not LiveDataNotice.jsx: a module that exports both a
// component and a hook breaks fast refresh.
export function useLiveDataHealth() {
  return useSyncExternalStore(subscribePollHealth, snapshot, snapshot)
}
