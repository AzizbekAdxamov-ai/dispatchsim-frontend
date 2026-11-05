import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsLeftRight, MagnifyingGlass, CaretDown, X } from '@phosphor-icons/react'
import { EQUIPMENT_TYPES, EQUIPMENT_ORDER } from '../../data/equipmentTypes'
import { placeLabel, matchPlaces } from './searchQuery'
import './SearchBar.css'

// The query a dispatcher actually types.
//
// One row, in the order the question is asked: where the truck is, how far
// it will go to get loaded, where it wants to end up, how far it will go
// from there, what it pulls, how long and how heavy it can take, and for
// which day. Nothing is searched until SEARCH is pressed -- the board is
// not a filter that narrows as you type, it is a question you finish
// asking and then send. That also keeps one request per search instead of
// one per keystroke.
//
// A place is a city, a state or a zone, because those are the three things
// the server can narrow by. DH-O measures from a city or the nearest
// available truck when origin is blank. State and zone searches show the
// whole market, because neither is a single point. DH-D still needs a
// destination city -- the server has no other point to measure it from --
// so only that input is disabled and explained.

// The radius the board opens with. Not a rule about anything: a starting
// point the dispatcher changes, and the first thing most of them change.
export const DEFAULT_RADIUS_MI = 150

function PlaceInput({ id, label, placeholder, place, cities, onChange }) {
  const [text, setText] = useState(placeLabel(place))
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  // The typed text follows the chosen place, not the other way round: a
  // search restored from the last session, or an origin and destination
  // swapped by the button between them, has to show what it searched.
  //
  // Adjusted during render rather than in an effect. An effect would let
  // one frame paint with the old text in the box and the new place in the
  // results -- and React re-runs this render before touching the DOM, so
  // nothing flickers.
  const [shownPlace, setShownPlace] = useState(place)
  if (place !== shownPlace) {
    setShownPlace(place)
    setText(placeLabel(place))
  }

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const matches = useMemo(() => matchPlaces(text, cities), [text, cities])

  function choose(next) {
    onChange(next)
    setText(placeLabel(next))
    setOpen(false)
  }

  return (
    <div className="sb-field sb-place" ref={boxRef}>
      <label className="sb-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="sb-input"
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches.length > 0) {
            e.preventDefault()
            choose(matches[0])
          }
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      {place && (
        <button type="button" className="sb-clear" onClick={() => choose(null)} aria-label={`Clear ${label}`}>
          <X size={12} aria-hidden="true" />
        </button>
      )}
      {open && matches.length > 0 && (
        <ul className="sb-menu" role="listbox">
          {matches.map((m) => (
            <li key={`${m.kind}:${m.city ?? m.state ?? m.zone}`}>
              <button type="button" className="sb-menu-item" onClick={() => choose(m)}>
                <span>{placeLabel(m)}</span>
                <span className="sb-menu-kind">{m.kind === 'city' ? 'City' : m.kind === 'state' ? 'State' : 'Zone'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EquipmentPicker({ selected, onChange }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function toggle(key) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  }

  const label = selected.length === 0
    ? 'All equipment'
    : selected.length === 1
      ? EQUIPMENT_TYPES[selected[0]].label
      : `${EQUIPMENT_TYPES[selected[0]].label} (+${selected.length - 1})`

  return (
    <div className="sb-field sb-picker" ref={boxRef}>
      <span className="sb-label">Equipment type</span>
      <button type="button" className="sb-input sb-button-input" onClick={() => setOpen((v) => !v)}>
        <span>{label}</span>
        <CaretDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <div className="sb-menu sb-menu-pad">
          {EQUIPMENT_ORDER.map((key) => {
            const eq = EQUIPMENT_TYPES[key]
            const Icon = eq.icon
            return (
              <label key={key} className="sb-check">
                <input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} />
                <Icon size={14} aria-hidden="true" />
                {eq.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SearchBar({ draft, cities, onDraftChange, onSearch }) {
  const set = (patch) => onDraftChange({ ...draft, ...patch })

  const originIsCity = draft.origin?.kind === 'city'
  const originIsMarket = draft.origin?.kind === 'state' || draft.origin?.kind === 'zone'
  const destIsCity = draft.destination?.kind === 'city'

  function swap() {
    set({ origin: draft.destination ?? null, destination: draft.origin ?? null })
  }

  return (
    <form
      className="sb"
      onSubmit={(e) => { e.preventDefault(); onSearch() }}
    >
      <PlaceInput
        id="sb-origin"
        label="Origin"
        placeholder="City, state or zone"
        place={draft.origin}
        cities={cities}
        onChange={(place) => set({ origin: place })}
      />

      <div className="sb-field sb-narrow">
        <label className="sb-label" htmlFor="sb-dho">DH-O</label>
        <input
          id="sb-dho"
          className="sb-input"
          type="number"
          min="0"
          max="5000"
          disabled={originIsMarket}
          title={originIsMarket ? 'Choose a city to search within a radius. State and zone searches show the whole market.' : originIsCity ? 'Miles from the selected city to pickup' : 'Miles from the nearest available truck to pickup'}
          value={draft.dhO ?? ''}
          onChange={(e) => set({ dhO: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </div>

      <button type="button" className="sb-swap" onClick={swap} title="Swap origin and destination">
        <ArrowsLeftRight size={16} aria-hidden="true" />
      </button>

      <PlaceInput
        id="sb-destination"
        label="Destination"
        placeholder="Anywhere"
        place={draft.destination}
        cities={cities}
        onChange={(place) => set({ destination: place })}
      />

      <div className="sb-field sb-narrow">
        <label className="sb-label" htmlFor="sb-dhd">DH-D</label>
        <input
          id="sb-dhd"
          className="sb-input"
          type="number"
          min="0"
          max="5000"
          disabled={!destIsCity}
          title={destIsCity ? 'Miles from the delivery to where the truck wants to end up' : 'Pick a destination city to measure a radius to'}
          value={draft.dhD ?? ''}
          onChange={(e) => set({ dhD: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </div>

      <EquipmentPicker
        selected={draft.equipmentType ?? []}
        onChange={(next) => set({ equipmentType: next })}
      />

      {/* Every posting on this board is a full trailer. Shown rather than
          left out so the row reads the way it does everywhere else, and
          fixed rather than offered as a choice that has one answer. A
          partial would need the broker to post one. */}
      <div className="sb-field sb-narrow-2">
        <span className="sb-label">Load type</span>
        <span className="sb-input sb-static" title="Brokers post full trailers on this board">Full</span>
      </div>

      <div className="sb-field sb-narrow-2">
        <label className="sb-label" htmlFor="sb-length">Length ft</label>
        <input
          id="sb-length"
          className="sb-input"
          type="number"
          min="1"
          max="100"
          placeholder="Any"
          title="The longest load the trailer can take"
          value={draft.maxLengthFt ?? ''}
          onChange={(e) => set({ maxLengthFt: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </div>

      <div className="sb-field sb-narrow-2">
        <label className="sb-label" htmlFor="sb-weight">Weight lbs</label>
        <input
          id="sb-weight"
          className="sb-input"
          type="number"
          min="1"
          max="100000"
          placeholder="Any"
          title="The heaviest load the truck can take"
          value={draft.maxWeightLbs ?? ''}
          onChange={(e) => set({ maxWeightLbs: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </div>

      <div className="sb-field sb-dates">
        <span className="sb-label">Pick up</span>
        <div className="sb-date-pair">
          <input
            className="sb-input"
            type="date"
            aria-label="Pick up from"
            value={draft.pickupFromDay ?? ''}
            onChange={(e) => set({ pickupFromDay: e.target.value || null })}
          />
          <span className="sb-dash">–</span>
          <input
            className="sb-input"
            type="date"
            aria-label="Pick up to"
            value={draft.pickupToDay ?? ''}
            onChange={(e) => set({ pickupToDay: e.target.value || null })}
          />
        </div>
      </div>

      <button type="submit" className="sb-search">
        <MagnifyingGlass size={15} aria-hidden="true" />
        Search
      </button>
      {originIsMarket && <span className="sb-radius-hint">Choose an origin city to use DH-O. State and zone searches show all matching loads.</span>}
    </form>
  )
}
