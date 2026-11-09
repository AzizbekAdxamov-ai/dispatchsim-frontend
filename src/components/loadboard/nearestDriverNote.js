// What the "Nearest driver" slot says when there is nobody to show. The
// board measures from the fleet unless the dispatcher typed a city; in fleet
// mode a posting without a driver means no truck in the fleet pulls that
// trailer (the server only offers drivers whose truck matches the posting).
export const NEAREST_DRIVER_COPY = Object.freeze({
  noMatch: (label) => `No ${label} truck in the fleet`,
})

// equipmentLabel is the display label of posting.equipmentType (the caller
// reads it from data/equipmentTypes.js). Returns null when there is a driver
// to show or the board is measuring from a typed city.
export function nearestDriverNote(posting, deadheadFrom, copy = NEAREST_DRIVER_COPY, equipmentLabel = '') {
  if (posting?.nearestDriverName || posting?.nearestDriver) return null
  if (deadheadFrom?.kind === 'location') return null

  return copy.noMatch(equipmentLabel)
}
