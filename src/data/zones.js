// Freight zone keys and their display labels.
//
// The KEYS here must match backend/src/constants/zones.js exactly — that file
// is the single source of truth for which states belong to which zone, and it
// is what the API validates against. This file only adds the human-readable
// labels, the same split as data/equipmentTypes.js vs constants/equipment.js.
//
// A zone is derived from the state code on the backend; nothing about it is
// stored per posting, so there is no data to migrate if a zone is renamed.

export const ZONE_ORDER = [
  'northeast',
  'southeast',
  'midwest',
  'south-central',
  'mountain-west',
  'west-coast',
]

export const ZONE_LABEL = {
  northeast: 'Northeast',
  southeast: 'Southeast',
  midwest: 'Midwest',
  'south-central': 'South Central',
  'mountain-west': 'Mountain West',
  'west-coast': 'West Coast',
}

export function zoneLabel(key) {
  return ZONE_LABEL[key] ?? key
}
