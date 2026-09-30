import { useCallback, useState } from 'react'
import { getCarrier, updateCarrier } from '../../api/carrier'
import { useResource } from '../../hooks/useResource'

// The company itself, as it appears on paper.
//
// It used to have no row of its own: the name on every rate confirmation
// was whatever each person typed into "Company / team name" when they
// registered, and there was no MC number anywhere in the program -- so
// the carrier column of a rate confirmation said, in grey, that the
// number had not been issued. A broker checks that number before they
// send anyone a load.
//
// Read by every role because each of them handles paper with it on:
// dispatch signs the rate confirmation, finance sends the invoice.
// Changing it is an administrator's act -- renaming the company mid-run
// rewrites every document it sends from then on.

const FIELDS = [
  { key: 'name', label: 'Carrier name', hint: 'As it appears on the rate confirmation' },
  { key: 'mcNumber', label: 'MC number', hint: 'MC-123456' },
  { key: 'dotNumber', label: 'USDOT number', hint: '6 to 8 digits' },
  { key: 'phone', label: 'Phone' },
  { key: 'addressLine', label: 'Street' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State', hint: 'Two letters' },
  { key: 'postalCode', label: 'ZIP', hint: 'Five digits' },
]

export default function CarrierPanel({ isAdmin = false }) {
  const fetchCarrier = useCallback((signal) => getCarrier(signal), [])
  const { data, error, refetch } = useResource(fetchCarrier, [])

  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const value = (key) => edits[key] ?? data?.[key] ?? ''
  const changed = Object.keys(edits).filter((key) => edits[key] !== (data?.[key] ?? ''))

  async function onSave() {
    setSaving(true)
    setSaveError('')
    try {
      const patch = Object.fromEntries(changed.map((key) => [key, edits[key]]))
      await updateCarrier(patch)
      setEdits({})
      setSaved(true)
      refetch()
    } catch (err) {
      // The server's own sentence: the formats it refuses are the same
      // ones the database refuses, and it says which.
      setSaveError(err?.message || 'Could not save the carrier details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel">
      <div className="panel-head"><div className="panel-title">Carrier</div></div>
      <div className="settings-body">
        {error && !data && (
          <div className="settings-row-desc" role="alert">
            Could not read the carrier details — {error.message}
          </div>
        )}

        {data && FIELDS.map((field) => (
          <div className="settings-field" key={field.key}>
            <label htmlFor={`carrier-${field.key}`}>{field.label}</label>
            <input
              id={`carrier-${field.key}`}
              value={value(field.key)}
              readOnly={!isAdmin}
              placeholder={field.hint ?? ''}
              onChange={isAdmin ? (e) => { setEdits({ ...edits, [field.key]: e.target.value }); setSaved(false) } : undefined}
            />
          </div>
        ))}

        <div className="settings-row-desc">
          {isAdmin
            ? 'This name and these numbers go on every rate confirmation and every invoice this company sends.'
            : 'Your administrator maintains these. They appear on every rate confirmation and invoice this company sends.'}
        </div>

        {isAdmin && (
          <div className="settings-field">
            {saveError && <div className="settings-row-desc" role="alert">{saveError}</div>}
            <button type="button" className="settings-save-btn" disabled={saving || changed.length === 0} onClick={onSave}>
              {saving ? 'Saving…' : saved && changed.length === 0 ? 'Saved' : 'Save carrier details'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
