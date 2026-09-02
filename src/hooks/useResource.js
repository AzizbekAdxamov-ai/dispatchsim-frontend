// Shared data-fetching hook for read-only API calls: { data, error, loading }
// + AbortController, so the 9-odd pages that each need "fetch on mount,
// refetch when deps change, ignore a response that arrives after the
// component moved on" don't hand-roll it nine slightly different ways.
//
// `fetcher` is called as fetcher(signal) — every api/*.js function in this
// app accepts an AbortSignal as its last argument (see api/loads.js etc.)
// so it can be passed straight through.
//
// Polling: pass { pollMs } as the third argument to enable background
// refresh. During polling, `loading` stays false — an independent
// `refreshing` flag indicates a background fetch is in flight. Background
// errors never clear existing `data`; only the first load sets `error`.
// Tabs hidden via document.visibilityState skip polls entirely.
import { useEffect, useRef, useState, useCallback } from 'react'
import { ApiError } from '../api/client'

export function useResource(fetcher, deps = [], options = {}) {
  const { pollMs } = options
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Bumped on every refetch() call so a caller can force a reload without
  // needing a new dependency value.
  const [reloadToken, setReloadToken] = useState(0)

  // Track whether the initial load has completed — background errors
  // should never overwrite `data` or set `error` after first success.
  const hasLoaded = useRef(false)

  // In-flight poll controller — aborted when deps change, on unmount,
  // or when a new poll starts (prevents stale responses from overwriting
  // fresh data after a filter change).
  const pollControllerRef = useRef(null)

  // --- Core fetch function (used for both initial load and polling) ---
  const doFetch = useCallback(
    async (signal, isPoll) => {
      if (isPoll) setRefreshing(true)
      else setLoading(true)

      try {
        const result = await fetcherRef.current(signal)
        if (signal.aborted) return
        setData(result)
        if (!isPoll) setLoading(false)
        hasLoaded.current = true
      } catch (err) {
        if (signal.aborted || err?.name === 'AbortError') return
        const apiErr = err instanceof ApiError ? err : new ApiError('INTERNAL_ERROR', 'Something went wrong. Please try again.', 0)
        if (isPoll) {
          // Background error — keep existing data, don't set error
        } else {
          setError(apiErr)
          setLoading(false)
        }
      } finally {
        if (isPoll) setRefreshing(false)
      }
    },
    [],
  )

  // Start a new background poll, aborting any in-flight poll first.
  // This prevents the race: user changes filter → deps fire → old poll
  // response arrives after new data and overwrites it with stale results.
  const startPoll = useCallback(() => {
    pollControllerRef.current?.abort()
    const controller = new AbortController()
    pollControllerRef.current = controller
    doFetch(controller.signal, true)
  }, [doFetch])

  // --- Initial load + deps-triggered refetch ---
  useEffect(() => {
    const controller = new AbortController()
    // Abort any in-flight poll — the deps just changed, so the old poll
    // response is now stale and must not overwrite fresh data.
    pollControllerRef.current?.abort()
    pollControllerRef.current = null
    hasLoaded.current = false
    setLoading(true)
    setError(null)

    doFetch(controller.signal, false)

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  // --- Polling interval ---
  useEffect(() => {
    if (!pollMs) return

    const interval = setInterval(() => {
      // Skip poll if tab is not visible
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      startPoll()
    }, pollMs)

    // When tab becomes visible again after being hidden, do one immediate
    // poll so the user sees fresh data without waiting for the next tick.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && hasLoaded.current) {
        startPoll()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      pollControllerRef.current?.abort()
      pollControllerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, startPoll])

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  return { data, error, loading, refreshing, refetch }
}
