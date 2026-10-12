import { useId, useMemo, useState } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { searchPlaces } from './placeSearch'
import './MapSearch.css'

// The box on the Map page: type a city or a state, pick it, the map goes
// there. The words and the ranking are placeSearch.js's (tested without
// React); this file is only the input, the list, and the keys.
//
// A combobox in the ARIA sense -- arrow keys move through the matches,
// Enter takes the highlighted one (or the first), Escape closes the list
// and then clears the box -- so it works without a mouse, the same way
// the load board's search does.

export default function MapSearch({ index, cityCount, onPick }) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const results = useMemo(() => searchPlaces(query, index), [query, index])
  const showList = open && query.trim() !== ''

  function pick(place) {
    if (!place) return
    setQuery(place.label)
    setOpen(false)
    onPick?.(place)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(results[active] ?? results[0])
    } else if (e.key === 'Escape') {
      if (open && query) setOpen(false)
      else setQuery('')
    }
  }

  return (
    <div className="map-search">
      <div className="map-search-box">
        <MagnifyingGlass size={14} aria-hidden="true" className="map-search-icon" />
        <input
          type="text"
          className="map-search-input"
          placeholder="Find a city or state"
          value={query}
          role="combobox"
          aria-label="Find a city or state on the map"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
          onFocus={() => setOpen(true)}
          // Delayed so a click on a result lands before the list goes away.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button type="button" className="map-search-clear" aria-label="Clear search" onClick={() => { setQuery(''); setActive(0) }}>
            <X size={12} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>

      {showList && (
        <ul className="map-search-list" id={listId} role="listbox">
          {results.length === 0 ? (
            // What the search covers, said when it finds nothing -- a town
            // outside the network is not "not in America", it is not in
            // this list, and the difference is the useful part.
            <li className="map-search-empty" role="presentation">
              No city or state matches “{query.trim()}”.
              <span>Searches the {cityCount} cities in the dispatch network and all 48 states + DC.</span>
            </li>
          ) : results.map((place, i) => (
            <li
              key={place.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`map-search-option${i === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(place) }}
            >
              <span className="map-search-label">{place.label}</span>
              <span className="map-search-sub">{place.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
