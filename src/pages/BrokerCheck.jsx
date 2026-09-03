import { useState, useCallback } from 'react'
import { MagnifyingGlass, Warning } from '@phosphor-icons/react'
import { checkMc, listChecks } from '../api/brokerCheck'
import { ApiError } from '../api/client'
import { useResource } from '../hooks/useResource'
import '../components/dashboard/Panel.css'
import './BrokerCheck.css'

// Vetting a broker before you haul for them is a step a dispatcher takes on
// purpose. The load board deliberately shows only the MC number, so the
// rating and the payment days exist here and nowhere else — a dispatcher
// who never opens this page books blind and meets the result in finance
// when the receivable ages.
//
// The page states facts and stops. No colour coding, no "risky" label, no
// icon that leans one way: A pays in twenty days and D pays in sixty-eight,
// and what to do about that is the dispatcher's call.

function errorText(err) {
  const code = err instanceof ApiError ? err.code : null
  if (code === 'NETWORK_ERROR') return 'Cannot reach the server.'
  return err?.message || 'Something went wrong. Please try again.'
}

function formatChecked(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function BrokerCheck() {
  const [mcInput, setMcInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const fetchChecks = useCallback(async (signal) => await listChecks(signal), [])
  const { data, loading, refetch } = useResource(fetchChecks, [])
  const checks = data?.checks ?? []

  async function handleCheck() {
    const mcNumber = mcInput.trim()
    if (!mcNumber || busy) return
    setError('')
    setResult(null)
    setBusy(true)
    try {
      const res = await checkMc(mcNumber)
      setResult(res)
      refetch()
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Broker check</h1>
        <p className="page-sub">
          Run an MC number before you commit to a load. Every lookup is kept below.
        </p>
      </div>

      <div className="bk-search">
        <input
          type="text"
          className="bk-input"
          placeholder="MC number (e.g. MC-482913)"
          value={mcInput}
          onChange={(e) => setMcInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
        />
        <button type="button" className="bk-btn" disabled={busy || !mcInput.trim()} onClick={handleCheck}>
          <MagnifyingGlass size={15} weight="bold" />
          {busy ? 'Checking…' : 'Check'}
        </button>
      </div>

      {error && (
        <div className="bk-error" role="alert">
          <Warning size={15} weight="fill" />
          <span>{error}</span>
        </div>
      )}

      {result && result.found && (
        <div className="bk-result">
          <div className="bk-result-name">{result.broker.name}</div>
          <dl className="bk-result-facts">
            <div><dt>MC number</dt><dd className="mono">{result.broker.mcNumber}</dd></div>
            <div><dt>Contact</dt><dd>{result.broker.contactName}</dd></div>
            <div><dt>Credit rating</dt><dd className="mono">{result.broker.creditRating}</dd></div>
            <div><dt>Pays in</dt><dd className="mono">{result.broker.daysToPay} days</dd></div>
          </dl>
        </div>
      )}

      {result && !result.found && (
        <div className="bk-result bk-result-miss">
          <div className="bk-result-name">No carrier record</div>
          <p>
            Nothing on file for <span className="mono">{result.check.mcNumber}</span>. The lookup is
            in your log either way.
          </p>
        </div>
      )}

      <div className="panel bk-log">
        <div className="panel-head">
          <span className="panel-title">Lookup log</span>
          <span className="panel-count">{checks.length}</span>
        </div>
        {loading && <div className="page-empty">Loading…</div>}
        {!loading && checks.length === 0 && (
          <div className="page-empty" style={{ padding: 24 }}>
            Nothing checked yet.
          </div>
        )}
        {!loading && checks.length > 0 && (
          <table className="bk-table">
            <thead>
              <tr>
                <th>MC number</th>
                <th>Broker</th>
                <th>Rating</th>
                <th>Pays in</th>
                <th>Checked</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.mcNumber}</td>
                  <td>{c.brokerName || 'No record'}</td>
                  <td className="mono">{c.creditRating || '—'}</td>
                  <td className="mono">{c.daysToPay != null ? `${c.daysToPay} days` : '—'}</td>
                  <td className="bk-when">{formatChecked(c.checkedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
