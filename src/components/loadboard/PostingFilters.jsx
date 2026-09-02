import { useEffect, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { EQUIPMENT_TYPES, EQUIPMENT_ORDER } from '../../data/equipmentTypes'
import { listCities } from '../../api/loadBoard'
import { ZONE_ORDER, ZONE_LABEL } from '../../data/zones'

const SORT_OPTIONS = [
  { key: 'posted', label: 'Newest' },
  { key: 'ratePerMile', label: 'Rate/mi' },
  { key: 'deadhead', label: 'Deadhead' },
  { key: 'pickup', label: 'Pickup' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

export default function PostingFilters({ filters, onChange }) {
  const { equipmentType, originState, originZone, destinationZone, sort, search, fromCity, fromState } = filters
  const [cities, setCities] = useState([])

  useEffect(() => {
    let cancelled = false
    listCities(new AbortController().signal).then((data) => {
      if (!cancelled) setCities(data)
    }).catch(() => {}) // silent — cities are static
    return () => { cancelled = true }
  }, [])

  function set(key, value) {
    onChange({ ...filters, [key]: value })
  }

  function handleCityChange(e) {
    const val = e.target.value
    if (!val) {
      onChange({ ...filters, fromCity: undefined, fromState: undefined })
    } else {
      const [city, state] = val.split('|')
      onChange({ ...filters, fromCity: city, fromState: state })
    }
  }

  const cityValue = fromCity && fromState ? `${fromCity}|${fromState}` : ''

  return (
    <div className="lb-filters">
      <div className="lb-search">
        <MagnifyingGlass size={15} aria-hidden="true" />
        <input
          type="text"
          placeholder="Broker, city or commodity…"
          value={search || ''}
          onChange={(e) => set('search', e.target.value)}
        />
      </div>

      <div className="lb-filters-row">
        <div className="lb-filter-group" role="group" aria-label="Filter by equipment type">
          <button
            className={'lb-filter-btn' + (!equipmentType ? ' active' : '')}
            onClick={() => set('equipmentType', undefined)}
            aria-pressed={!equipmentType}
          >
            All
          </button>
          {EQUIPMENT_ORDER.map((key) => {
            const eq = EQUIPMENT_TYPES[key]
            const Icon = eq.icon
            return (
              <button
                key={key}
                className={'lb-filter-btn' + (equipmentType === key ? ' active' : '')}
                onClick={() => set('equipmentType', key)}
                aria-pressed={equipmentType === key}
                title={eq.label}
              >
                <Icon size={14} aria-hidden="true" />
                {eq.label}
              </button>
            )
          })}
        </div>

        <div className="lb-filter-group">
          <select
            className="lb-select"
            value={cityValue}
            onChange={handleCityChange}
            aria-label="Deadhead from city"
          >
            <option value="">Deadhead — fleet</option>
            {cities.map((c) => (
              <option key={`${c.city}|${c.state}`} value={`${c.city}|${c.state}`}>
                {c.city}, {c.state}
              </option>
            ))}
          </select>

          <select
            className="lb-select"
            value={originState || ''}
            onChange={(e) => set('originState', e.target.value || undefined)}
            aria-label="Origin state"
          >
            <option value="">All states</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="lb-select"
            value={originZone || ''}
            onChange={(e) => set('originZone', e.target.value || undefined)}
            aria-label="Origin zone"
          >
            <option value="">All origin zones</option>
            {ZONE_ORDER.map((z) => (
              <option key={z} value={z}>From {ZONE_LABEL[z]}</option>
            ))}
          </select>

          <select
            className="lb-select"
            value={destinationZone || ''}
            onChange={(e) => set('destinationZone', e.target.value || undefined)}
            aria-label="Destination zone"
          >
            <option value="">All destination zones</option>
            {ZONE_ORDER.map((z) => (
              <option key={z} value={z}>To {ZONE_LABEL[z]}</option>
            ))}
          </select>

          <select
            className="lb-select"
            value={sort || 'posted'}
            onChange={(e) => set('sort', e.target.value)}
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
