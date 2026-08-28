import { Van, Snowflake, Stack, TruckTrailer, Drop, Truck } from '@phosphor-icons/react'
import truckDryVan from '../assets/truck-side.png'
import truckDryVanNight from '../assets/truck-side-night.png' 
import truckReefer from '../assets/truck-slate.png'
import truckFlatbed from '../assets/truck-flatbed-slate.png'
import truckStepDeck from '../assets/truck-lowboy-slate.png'
import truckTanker from '../assets/truck-tanker-slate.png'
import truckPowerOnly from '../assets/truck-power-only.png'

// Single source of truth for equipment type → label/icon/image.
// image is deliberately theme-independent: each type has exactly one
// dedicated illustration so the artwork always matches the label.
export const EQUIPMENT_TYPES = {
  'dry-van': {
    key: 'dry-van',
    label: 'Dry Van',
    icon: Van,
    image: { dark: truckDryVanNight, light: truckDryVan },
    themedImage: false,
  },
  reefer: {
    key: 'reefer',
    label: 'Reefer',
    icon: Snowflake,
    image: { dark: truckReefer, light: truckReefer },
    themedImage: false,
  },
  flatbed: {
    key: 'flatbed',
    label: 'Flatbed',
    icon: Stack,
    image: { dark: truckFlatbed, light: truckFlatbed },
    themedImage: true,
  },
  'step-deck': {
    key: 'step-deck',
    label: 'Step Deck',
    icon: TruckTrailer,
    image: { dark: truckStepDeck, light: truckStepDeck },
    themedImage: true,
  },
  tanker: {
    key: 'tanker',
    label: 'Tanker',
    icon: Drop,
    image: { dark: truckTanker, light: truckTanker },
    themedImage: true,
  },
  'power-only': {
    key: 'power-only',
    label: 'Power Only',
    icon: Truck,
    image: { dark: truckPowerOnly, light: truckPowerOnly },
    themedImage: false,
  },
}

export const EQUIPMENT_ORDER = ['dry-van', 'reefer', 'flatbed', 'step-deck', 'tanker', 'power-only']

// Best-effort parser kept only for free-text equipment strings that
// don't already carry a structured `equipmentType` key (e.g. legacy data).
export function equipmentTypeOf(equipmentStr) {
  const s = (equipmentStr || '').toLowerCase()
  if (s.includes('reefer')) return 'reefer'
  if (s.includes('flatbed')) return 'flatbed'
  if (s.includes('tanker')) return 'tanker'
  if (s.includes('step deck') || s.includes('step-deck') || s.includes('lowboy')) return 'step-deck'
  if (s.includes('power only') || s.includes('power-only') || s.includes('bobtail')) return 'power-only'
  return 'dry-van'
}

export function formatEquipment(load) {
  const eq = EQUIPMENT_TYPES[load.equipmentType]
  return eq ? eq.label + ', ' + load.equipmentLength : ''
}
