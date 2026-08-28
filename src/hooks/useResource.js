// Shared data-fetching hook for read-only API calls: { data, error, loading }
// + AbortController, so the 9-odd pages that each need "fetch on mount,
// refetch when deps change, ignore a response that arrives after the
// component moved on" don't hand-roll it nine slightly different ways.
//
// `fetcher` is called as fetcher(signal) — every api/*.js function in this
// app accepts an AbortSignal as its last argument (see api/loads.js etc.)
// so it can be passed straight through.
import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'

export function useResource(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Bumped on every refetch() call so a caller can force a reload without
  // needing a new dependency value.
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    setLoading(true)
    setError(null)

    fetcherRef.current(controller.signal)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return
        setError(err instanceof ApiError ? err : new ApiError('INTERNAL_ERROR', 'Something went wrong. Please try again.', 0))
        setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  const refetch = () => setReloadToken((t) => t + 1)

  return { data, error, loading, refetch }
}
