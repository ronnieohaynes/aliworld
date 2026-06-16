/**
 * Canonical midnight variant MAP — single source for mothership dropdown,
 * user_set_variant validation, and game rendering paths.
 *
 * Add an entry here to register a sprite. Omit from MIDNIGHT_VARIANTS
 * (src/data/midnightVariants.ts) to keep it off the creation carousel.
 *
 * After editing: redeploy analytics-summary (`supabase functions deploy analytics-summary`).
 */

export const MIDNIGHT_VARIANT_SHEET = {
  default: { folder: 'midnight', file: 'midnight-default.png' },
  'asian-f': { folder: 'midnight', file: 'midnight-asian-f.png' },
  'latino-m': { folder: 'midnight', file: 'midnight-latino-m.png' },
  'white-f': { folder: 'midnight', file: 'midnight-white-f.png' },
  'filipino-m': { folder: 'midnight', file: 'midnight-filipino-m.png' },
  'danny-ali': { folder: 'midnight', file: 'danny-ali.png' },
  'player-riley-m': { folder: 'variants', file: 'player-riley-m.png' },
  'player-blnt': { folder: 'variants', file: 'player-blnt.png' },
  'player-ron': { folder: 'variants', file: 'player-ron.png' },
  'player-stunna': { folder: 'variants', file: 'player-stunna.png' },
  'cencere-test': { folder: 'variants', file: 'cencere-test.png' },
} as const

export type MidnightVariantId = keyof typeof MIDNIGHT_VARIANT_SHEET

const REGISTERED_IDS = Object.keys(MIDNIGHT_VARIANT_SHEET) as MidnightVariantId[]

export function listRegisteredMidnightVariantIds(): readonly MidnightVariantId[] {
  return REGISTERED_IDS
}

/** True when id exists in the full renderable MAP (hidden + public). */
export function isRegisteredMidnightVariantId(id: string): id is MidnightVariantId {
  return Object.prototype.hasOwnProperty.call(MIDNIGHT_VARIANT_SHEET, id)
}

export function getMidnightVariantSheetEntry(id: MidnightVariantId) {
  return MIDNIGHT_VARIANT_SHEET[id]
}

export type MidnightVariantAdminOption = {
  id: MidnightVariantId
  label: string
  hidden: boolean
}

/** Mothership dropdown — full MAP; hidden tag = not on creation carousel. */
export function listAdminMidnightVariantOptions(
  creationSelectIds: ReadonlySet<string>,
): MidnightVariantAdminOption[] {
  return listRegisteredMidnightVariantIds()
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({
      id,
      label: creationSelectIds.has(id) ? id : `${id} (hidden)`,
      hidden: !creationSelectIds.has(id),
    }))
}
