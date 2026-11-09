// What the "Nearest driver" slot says when there is nobody to show. The
// board measures from the fleet unless the dispatcher typed a city. In fleet
// mode an empty slot has two causes: the fleet owns no truck with this
// posting's trailer type at all (the server says so with fleetHasEquipment),
// or such trucks exist but none is free or has a position.
export const NEAREST_DRIVER_COPY = Object.freeze({
  noMatch: (label) => `No ${label} truck in the fleet`,
  noneFree: 'No driver free near this origin.',
})

// equipmentLabel is the display label of posting.equipmentType (the caller
// reads it from data/equipmentTypes.js). Returns null when there is a driver
// to show or the board is measuring from a typed city.
export function nearestDriverNote(posting, deadheadFrom, copy = NEAREST_DRIVER_COPY, equipmentLabel = '') {
  if (posting?.nearestDriverName || posting?.nearestDriver) return null
  if (deadheadFrom?.kind === 'location') return null
  return posting?.fleetHasEquipment === false ? copy.noMatch(equipmentLabel) : copy.noneFree
}
