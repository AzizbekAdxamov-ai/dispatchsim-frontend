import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// Keeps keyboard focus inside `ref` while `active`: moves focus in on
// activation, cycles Tab / Shift+Tab, calls `onEscape` on Esc, and puts
// focus back on whatever had it before when it deactivates.
export function useFocusTrap(ref, active, onEscape) {
  const escapeRef = useRef(onEscape)
  useEffect(() => {
    escapeRef.current = onEscape
  })

  useEffect(() => {
    if (!active) return undefined
    const root = ref.current
    if (!root) return undefined
    const previous = document.activeElement

    const items = () => [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
    const first = items()[0]
    if (first) first.focus()
    else {
      root.setAttribute('tabindex', '-1')
      root.focus()
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        escapeRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const list = items()
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      const current = document.activeElement
      if (!root.contains(current)) {
        e.preventDefault()
        firstEl.focus()
      } else if (e.shiftKey && current === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && current === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus()
    }
  }, [ref, active])
}
