import { useCallback, useEffect, useMemo, useState } from 'react'
import { listPostings, listCities } from '../api/loadBoard'
import { useResource } from '../hooks/useResource'
import { EQUIPMENT_TYPES } from '../data/equipmentTypes'
import { rateQuote, RATE_LABELS } from '../utils/rateQuote'
import { formatMoney, formatWeight, formatRatePerMile } from '../utils/format'
import SearchBar, { DEFAULT_RADIUS_MI } from '../components/loadboard/SearchBar'
import { toFilters } from '../components/loadboard/searchQuery'
import RowDetail from '../components/loadboard/RowDetail'
import './PageHeader.css'
import './LoadBoard.css'

const PAGE_SIZE = 50

const SORTS = [
  { key: 'rate', label: 'Rate – highest' },
  { key: 'ratePerMile', label: 'Rate per mile – highest' },
  { key: 'posted', label: 'Age – newest' },
  { key: 'deadhead', label: 'DH-O – nearest' },
  { key: 'pickup', label: 'Pick up – soonest' },
]

function ageLabel(iso) {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) return 'now'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

// The pickup day as the board shows every other time: on the operation's
// clock, not the viewer's. formatMonthDay would do it too, but the column
// is one line wide and "Sep 26" is what fits.
function pickupLabel(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'numeric', day: 'numeric' }).format(d)
}

// Deadhead is stated, not graded. It used to be painted green under 100
// miles, amber under 250 and red beyond — the program deciding, on the
// dispatcher's behalf, which runs were worth making, eight lines away from
// the comment explaining why the broker's credit rating is deliberately
// withheld from the same board. The number is the fact; what it is worth
// depends on the rate, the lane and who is sitting where, and that
// judgement belongs to the student.
function dhLabel(mi) {
  if (mi == null) return '—'
  return `(${Math.round(mi).toLocaleString('en-US')})`
}

const EMPTY_DRAFT = {
  origin: null,
  destination: null,
  dhO: DEFAULT_RADIUS_MI,
  dhD: DEFAULT_RADIUS_MI,
  equipmentType: [],
  maxLengthFt: null,
  maxWeightLbs: null,
  pickupFromDay: null,
  pickupToDay: null,
  sort: 'posted',
}

// The search survives a reload, in this tab only: two tabs can hold two
// different searches, the same way they can hold two different accounts.
const STORAGE_KEY = 'lb-search'

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : EMPTY_DRAFT
  } catch {
    return EMPTY_DRAFT
  }
}

function saveDraft(draft) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft)) } catch { /* private window */ }
}

export default function LoadBoard({ rateLabels = RATE_LABELS }) {
  const [draft, setDraft] = useState(loadDraft)
  // What was actually asked for. Separate from the draft on purpose: the
  // board answers a question that was finished, not one being typed.
  const [filters, setFilters] = useState(() => toFilters(loadDraft()))
  const [openId, setOpenId] = useState(null)
  const [cities, setCities] = useState([])

  useEffect(() => {
    const ctrl = new AbortController()
    listCities(ctrl.signal).then(setCities).catch(() => {
      // The list only feeds the suggestions; typing still works without
      // it, and the search itself reports its own failures.
    })
    return () => ctrl.abort()
  }, [])

  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  const fetchPostings = useCallback(
    async (signal) => listPostings({ ...filters, limit: PAGE_SIZE }, signal),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey is the value of filters
    [filterKey],
  )

  // Polled, because postings drip on and expire underneath the board with
  // nothing the dispatcher clicked to cause it. `loading` stays false
  // during a poll, so the list does not flash.
  const { data, error, loading } = useResource(fetchPostings, [filterKey], { pollMs: 30000 })

  function runSearch(next = draft) {
    setDraft(next)
    saveDraft(next)
    setFilters(toFilters(next))
    setOpenId(null)
  }

  const postings = data?.postings ?? []
  const meta = data?.meta
  const from = meta?.deadheadFrom
  const to = meta?.deadheadTo

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Search loads</div>
          <div className="page-sub">Open postings from brokers</div>
        </div>
      </div>

      <SearchBar
        draft={draft}
        cities={cities}
        onDraftChange={setDraft}
        onSearch={() => runSearch()}
      />

      <div className="lbh">
        <div className="lbh-counts">
          <span className="lbh-total">
            {loading && !data ? '…' : `${(meta?.total ?? 0).toLocaleString('en-US')} results`}
          </span>
          {/* The second number is what the same search finds with the
              circle widened. Stated, never acted on: the board does not
              widen anything by itself. */}
          {meta?.nearby > 0 && (
            <span className="lbh-nearby" title="Matching everything else, outside the DH-O / DH-D radius">
              +{meta.nearby.toLocaleString('en-US')} outside the radius
            </span>
          )}
        </div>

        <label className="lbh-sort">
          Sort by
          <select
            value={draft.sort ?? 'posted'}
            onChange={(e) => runSearch({ ...draft, sort: e.target.value })}
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>

        {/* Where the two distance columns are measured from. "48 miles"
            means something different depending on whose truck it is, so
            the board says whose. */}
        <div className="lbh-ref">
          {from?.kind === 'location' && <span>DH-O from {from.city}, {from.state}</span>}
          {from?.kind === 'driver' && <span>DH-O from the nearest driver — {from.driverName}</span>}
          {to && <span>DH-D to {to.city}, {to.state}</span>}
        </div>
      </div>

      <div className="lbt-wrap">
        <table className="lbt">
          <thead>
            <tr>
              <th className="lbt-r">Age</th>
              <th className="lbt-r">{rateLabels.totalRate}</th>
              <th className="lbt-r">Trip</th>
              <th>Origin</th>
              <th className="lbt-r">DH-O</th>
              <th>Destination</th>
              <th className="lbt-r">DH-D</th>
              <th className="lbt-r">Pick up</th>
              <th>EQ</th>
              <th className="lbt-r">Length</th>
              <th className="lbt-r">Weight</th>
              <th>Capacity</th>
              <th>Company</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr><td colSpan={14} className="lbt-empty">Searching…</td></tr>
            )}
            {error && !data && (
              <tr><td colSpan={14} className="lbt-empty">Could not load the board — {error.message}</td></tr>
            )}
            {data && postings.length === 0 && (
              <tr>
                <td colSpan={14} className="lbt-empty">
                  Nothing matches this search.
                  {meta?.nearby > 0 && ` ${meta.nearby.toLocaleString('en-US')} postings match everything except the radius.`}
                </td>
              </tr>
            )}
            {postings.map((p) => {
              const quote = rateQuote(p)
              const eq = EQUIPMENT_TYPES[p.equipmentType]
              const open = openId === p.id
              return [
                <tr
                  key={p.id}
                  className={`lbt-row${open ? ' open' : ''}`}
                  onClick={() => !p.blockedByBroker && setOpenId(open ? null : p.id)}
                >
                  <td className="lbt-r mono lbt-age">{ageLabel(p.postedAt)}</td>
                  {/* "Call for rate" — about one posting in ten goes up
                      without a price, the way they do on a real board. The
                      server sends rateUsd as NULL for those, so there is
                      no figure here to leak. */}
                  <td className="lbt-r lbt-rate">
                    {p.rateHidden ? (
                      <span className="lbt-ask">Call for rate</span>
                    ) : (
                      <>
                        <div className="mono">{formatMoney(quote.totalUsd)}</div>
                        {quote.split && <div className="lbt-sub">{rateLabels.split}</div>}
                        <div className="lbt-sub mono">
                          {formatRatePerMile(quote.totalUsd, p.distanceMi)}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="lbt-r mono">{p.distanceMi?.toLocaleString('en-US')}</td>
                  <td>{p.originCity}, {p.originState}</td>
                  <td className="lbt-r mono lbt-dh">{dhLabel(p.deadheadMi)}</td>
                  <td>{p.destinationCity}, {p.destinationState}</td>
                  <td className="lbt-r mono lbt-dh">{dhLabel(p.deadheadDestMi)}</td>
                  <td className="lbt-r mono">{pickupLabel(p.pickupAt)}</td>
                  <td className="lbt-eq" title={eq?.label ?? p.equipmentType}>{eq?.code ?? '—'}</td>
                  <td className="lbt-r mono">{p.equipmentLengthFt} ft</td>
                  <td className="lbt-r mono">{formatWeight(p.weightLbs)}</td>
                  <td>Full</td>
                  <td className="lbt-company">{p.blockedByBroker ? <span className="lbt-blocked">Blocked by broker</span> : p.broker}</td>
                  <td className="lbt-contact">{p.brokerContactName ?? '—'}</td>
                </tr>,
                open && (
                  <tr key={`${p.id}-detail`} className="lbt-detail-row">
                    <td colSpan={14}>
                      <RowDetail rateLabels={rateLabels} posting={p} deadheadFrom={from} deadheadTo={to} />
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
