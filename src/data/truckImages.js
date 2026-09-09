// Photographs for a truck listing, by trailer type.
//
// These are the project's own images (src/assets), not pictures taken from
// a dealer's site. A real listing photo carries a real carrier's name and
// numbers down the side of the trailer, and dropping that into an invented
// listing is the same mistake the broker names were changed to avoid: it
// puts a real company's identity on something they had nothing to do with.
// The same reasoning, applied to pictures instead of names.
import truckSlate from '../assets/truck-slate.png'
import truckFlatbed from '../assets/truck-flatbed-slate.png'
import truckLowboy from '../assets/truck-lowboy-slate.png'
import truckTanker from '../assets/truck-tanker-slate.png'
import truckPowerOnly from '../assets/truck-power-only.png'
import truckSide from '../assets/truck-side.png'
import truckSideNight from '../assets/truck-side-night.png'
import truckFront from '../assets/truck-front.png'

// Three angles per listing: the tractor with the trailer it is set up for,
// then two views of the tractor itself. Enough to look at, few enough that
// nothing has to load that the page does not show.
const BY_TRAILER = {
  'dry-van': [truckSlate, truckSide, truckFront],
  reefer: [truckSlate, truckSideNight, truckFront],
  flatbed: [truckFlatbed, truckSide, truckFront],
  'step-deck': [truckLowboy, truckSide, truckFront],
  tanker: [truckTanker, truckSideNight, truckFront],
  'power-only': [truckPowerOnly, truckSide, truckFront],
}

const FALLBACK = [truckSlate, truckSide, truckFront]

export function truckGallery(trailerType) {
  return BY_TRAILER[trailerType] ?? FALLBACK
}

export function truckThumb(trailerType) {
  return truckGallery(trailerType)[0]
}
