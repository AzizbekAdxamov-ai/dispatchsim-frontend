import { WifiSlash } from '@phosphor-icons/react'
import { useLiveDataHealth } from '../../hooks/useLiveDataHealth'
import './LiveDataNotice.css'

// One line for the whole app: the live data has stopped arriving, and
// why. Every polling screen keeps showing what it last received -- this
// says how old that is, so nobody reads a frozen board as a quiet one.
//
// Facts, not a verdict: the reason is the API's own message, the time is
// the last successful response. It does not tell the user what to do
// about it, and it does not guess whether the network or the server is
// at fault.
function clock(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function LiveDataNotice() {
  const health = useLiveDataHealth()

  if (health.failingCount === 0) return null

  return (
    <div className="live-data-notice" role="status">
      <WifiSlash size={14} weight="bold" aria-hidden="true" />
      <span>
        Live data stopped updating{health.lastOkAt ? ` at ${clock(health.lastOkAt)}` : ''}
        {health.failingCount > 1 ? ` · ${health.failingCount} screens` : ''}
        {health.message ? ` · ${health.message}` : ''}
      </span>
    </div>
  )
}
