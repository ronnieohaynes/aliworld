/**
 * Canonical midnight variant MAP — single source for mothership dropdown,
 * user_set_variant validation, and game rendering paths.
 *
 * Sheet layout (must match src/constants/gameAssets.ts + SpriteSheet slicing):
 *   1024×1024 canvas, 4×4 grid, 256×256 px per frame
 *   rows: down(0), up(1), left(2), right(3) — 4 walk frames per direction, idle = frame 1
 *   (96px in gameAssets is on-screen display height after scale, not source frame size)
 *
 * Folders:
 *   variants/     — live player / reward / creation sprites (served in-game)
 *   new sprites 2/ — staging only; run `npm run register-variants -- --apply`
 *
 * After editing: redeploy analytics-summary (`supabase functions deploy analytics-summary`).
 */

export type MidnightVariantShopSection = 'skin' | 'accessory' | 'emblem'

/** Dormant until the shop is live; same entries can populate the catalog later. */
export type MidnightVariantShopMeta = {
  price?: number
  section?: MidnightVariantShopSection
  /** Required when section is 'accessory' (e.g. 'asian-f'). */
  baseVariantId?: string
}

export type MidnightVariantRegistryEntry = {
  folder: string
  file: string
  /** In-world display name (mothership dropdown label). */
  displayName: string
  /** When true, mothership shows "(hidden)" — not on the start-menu carousel. */
  hidden: boolean
  shop?: MidnightVariantShopMeta
}

export const MIDNIGHT_VARIANT_SHEET = {
  default: {
    folder: 'variants',
    file: 'midnight-default.png',
    displayName: 'Default',
    hidden: false,
  },
  'asian-f': {
    folder: 'variants',
    file: 'midnight-asian-f.png',
    displayName: 'Asian F',
    hidden: false,
  },
  'latino-m': {
    folder: 'variants',
    file: 'midnight-latino-m.png',
    displayName: 'Latino M',
    hidden: false,
  },
  'white-f': {
    folder: 'variants',
    file: 'midnight-white-f.png',
    displayName: 'White F',
    hidden: false,
  },
  'filipino-m': {
    folder: 'variants',
    file: 'midnight-filipino-m.png',
    displayName: 'Filipino M',
    hidden: false,
  },
  'danny-ali': {
    folder: 'variants',
    file: 'danny-ali.png',
    displayName: 'Danny Ali',
    hidden: true,
  },
  'player-riley-m': {
    folder: 'variants',
    file: 'player-riley-m.png',
    displayName: 'Player Riley M',
    hidden: true,
  },
  'player-blnt': {
    folder: 'variants',
    file: 'player-blnt.png',
    displayName: 'Player Blnt',
    hidden: true,
  },
  'player-ron': {
    folder: 'variants',
    file: 'player-ron.png',
    displayName: 'Player Ron',
    hidden: true,
  },
  'player-stunna': {
    folder: 'variants',
    file: 'player-stunna.png',
    displayName: 'Player Stunna',
    hidden: true,
  },
  'player-fadi': {
    folder: 'variants',
    file: 'player-fadi.png',
    displayName: 'Player Fadi',
    hidden: true,
  },
  'cencere-test': {
    folder: 'variants',
    file: 'cencere-test.png',
    displayName: 'Cencere Test',
    hidden: true,
  },
  'week1-champion': {
    folder: 'variants',
    file: 'reward skins/week1-champion.png',
    displayName: 'Week 1 Champion',
    hidden: true,
  },
} as const satisfies Record<string, MidnightVariantRegistryEntry>

export type MidnightVariantId = keyof typeof MIDNIGHT_VARIANT_SHEET

const REGISTERED_IDS = Object.keys(MIDNIGHT_VARIANT_SHEET) as MidnightVariantId[]

export function listRegisteredMidnightVariantIds(): readonly MidnightVariantId[] {
  return REGISTERED_IDS
}

/** True when id exists in the full renderable MAP (hidden + public). */
export function isRegisteredMidnightVariantId(id: string): id is MidnightVariantId {
  return Object.prototype.hasOwnProperty.call(MIDNIGHT_VARIANT_SHEET, id)
}

export function getMidnightVariantSheetEntry(id: MidnightVariantId): MidnightVariantRegistryEntry {
  return MIDNIGHT_VARIANT_SHEET[id]
}

export type MidnightVariantAdminOption = {
  id: MidnightVariantId
  label: string
  hidden: boolean
}

/** IDs on the creation carousel; keep aligned with MIDNIGHT_VARIANTS in midnightVariants.ts */
export const MIDNIGHT_CREATION_VARIANT_IDS = new Set<string>([
  'default',
  'asian-f',
  'latino-m',
  'white-f',
  'filipino-m',
])

/** Mothership dropdown — full MAP; registry `hidden` drives the label tag. */
export function listAdminMidnightVariantOptions(): MidnightVariantAdminOption[] {
  return listRegisteredMidnightVariantIds()
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((id) => {
      const entry = MIDNIGHT_VARIANT_SHEET[id]
      return {
        id,
        label: entry.hidden ? `${entry.displayName} (hidden)` : entry.displayName,
        hidden: entry.hidden,
      }
    })
}

/** @deprecated Use listAdminMidnightVariantOptions — creation ids no longer drive hidden tags. */
export function listAllAdminMidnightVariantOptions(): MidnightVariantAdminOption[] {
  return listAdminMidnightVariantOptions()
}
