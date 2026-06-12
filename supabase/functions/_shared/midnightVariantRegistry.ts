/**
 * Canonical midnight variant MAP — every renderable id and its sheet location.
 * Add here to register a sprite; omit from MIDNIGHT_VARIANTS (midnightVariants.ts)
 * to keep it off the creation carousel.
 */

export const MIDNIGHT_VARIANT_SHEET = {
  default: { folder: 'midnight', file: 'midnight-default.png' },
  'asian-f': { folder: 'midnight', file: 'midnight-asian-f.png' },
  'latino-m': { folder: 'midnight', file: 'midnight-latino-m.png' },
  'white-f': { folder: 'midnight', file: 'midnight-white-f.png' },
  'filipino-m': { folder: 'midnight', file: 'midnight-filipino-m.png' },
  'danny-ali': { folder: 'midnight', file: 'danny-ali.png' },
  'player-riley-m': { folder: 'variants', file: 'player-riley-m.png' },
} as const

export type MidnightVariantId = keyof typeof MIDNIGHT_VARIANT_SHEET

const REGISTERED_IDS = Object.keys(MIDNIGHT_VARIANT_SHEET) as MidnightVariantId[]

export function listRegisteredMidnightVariantIds(): readonly MidnightVariantId[] {
  return REGISTERED_IDS
}

export function isRegisteredMidnightVariantId(id: string): id is MidnightVariantId {
  return Object.prototype.hasOwnProperty.call(MIDNIGHT_VARIANT_SHEET, id)
}

export function getMidnightVariantSheetEntry(id: MidnightVariantId) {
  return MIDNIGHT_VARIANT_SHEET[id]
}
