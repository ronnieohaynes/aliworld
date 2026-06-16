import { publicAsset } from '../utils/publicAsset'
import {
  isRegisteredMidnightVariantId,
  listAllAdminMidnightVariantOptions,
  listRegisteredMidnightVariantIds,
  MIDNIGHT_VARIANT_SHEET,
  type MidnightVariantId,
} from '../../supabase/functions/analytics-summary/variantRegistry.ts'

export { isRegisteredMidnightVariantId, listRegisteredMidnightVariantIds } from '../../supabase/functions/analytics-summary/variantRegistry.ts'

export type { MidnightVariantId }

const CHARACTERS_DIR = publicAsset('Assets/Characters')

/** Full variant MAP, id → walk sheet URL (every renderable sprite). */
const WALK_SRC = Object.fromEntries(
  Object.entries(MIDNIGHT_VARIANT_SHEET).map(([id, { folder, file }]) => [
    id,
    `${CHARACTERS_DIR}/${folder}/${file}`,
  ]),
) as Record<MidnightVariantId, string>

/** Manual per-variant sprite crop / feet tuning (no auto-detection). */
export type MidnightVariantRenderTuning = {
  /** Extra px added to source Y per direction (skips top of cell; avoids row bleed). */
  frameInsetTopDown: number
  frameInsetTopUp: number
  frameInsetTopLeft: number
  frameInsetTopRight: number
  /** Extra px removed from crop height (positive = shorter source slice). */
  frameInsetBottom: number
  /** Display Y adjustment (positive = draw lower on screen). */
  feetOffset: number
  /** Overworld: subtract from centered Y (default 12 matches legacy PLAYER_DRAW_Y_SHIFT_UP). */
  drawShiftUp: number
  rowPaddingDown: number
  rowPaddingUp: number
  rowPaddingLeft: number
  rowPaddingRight: number
  cropHeightDown: number
  cropHeightUp: number
  cropHeightLeft: number
  cropHeightRight: number
}

/** Values that reproduce the original default MDNGHT rendering exactly. */
export const MIDNIGHT_DEFAULT_RENDER_TUNING: MidnightVariantRenderTuning = {
  frameInsetTopDown: 0,
  frameInsetTopUp: 0,
  frameInsetTopLeft: 0,
  frameInsetTopRight: 0,
  frameInsetBottom: 0,
  feetOffset: 0,
  drawShiftUp: 12,
  rowPaddingDown: 4,
  rowPaddingUp: 4,
  rowPaddingLeft: 12,
  rowPaddingRight: -10,
  cropHeightDown: 252,
  cropHeightUp: 252,
  cropHeightLeft: 232,
  cropHeightRight: 232,
}

export type MidnightVariantDef = {
  id: MidnightVariantId
  render: MidnightVariantRenderTuning
}

export const MIDNIGHT_DEFAULT_VARIANT_ID: MidnightVariantId = 'default'

const BASELINE_RENDER = MIDNIGHT_DEFAULT_RENDER_TUNING

/** Creation carousel only, subset of the full MAP. */
export const MIDNIGHT_VARIANTS: readonly MidnightVariantDef[] = [
  { id: 'default', render: BASELINE_RENDER },
  {
    id: 'asian-f',
    render: {
      ...BASELINE_RENDER,
      frameInsetTopUp: 4,
    },
  },
  {
    id: 'latino-m',
    render: {
      ...BASELINE_RENDER,
      frameInsetTopDown: 4,
      frameInsetTopUp: 20,
      frameInsetTopLeft: 17,
      frameInsetTopRight: 4,
      rowPaddingDown: 0,
      rowPaddingUp: 0,
      rowPaddingLeft: 0,
      rowPaddingRight: 0,
      cropHeightDown: 262,
      cropHeightUp: 260,
      cropHeightLeft: 244,
      cropHeightRight: 252,
    },
  },
  {
    id: 'white-f',
    render: {
      ...BASELINE_RENDER,
      rowPaddingDown: 6,
      rowPaddingUp: 6,
      rowPaddingRight: 4,
    },
  },
  {
    id: 'filipino-m',
    render: {
      ...BASELINE_RENDER,
      frameInsetTopUp: 6,
      cropHeightDown: 260,
      cropHeightUp: 252,
    },
  },
] as const

const RENDER_BY_ID = (() => {
  const map = Object.fromEntries(
    listRegisteredMidnightVariantIds().map((id) => [id, BASELINE_RENDER]),
  ) as Record<MidnightVariantId, MidnightVariantRenderTuning>
  for (const variant of MIDNIGHT_VARIANTS) {
    map[variant.id] = variant.render
  }
  return map
})()

const SELECTABLE_IDS = new Set(MIDNIGHT_VARIANTS.map((v) => v.id))

export function isMidnightVariantId(value: string): value is MidnightVariantId {
  return isRegisteredMidnightVariantId(value)
}

export function isSelectableMidnightVariantId(value: string): boolean {
  return isMidnightVariantId(value) && SELECTABLE_IDS.has(value)
}

/** Admin + assign, every id in the full MAP; hidden = not on creation carousel. */
export function listAllMidnightVariantOptions() {
  return listAllAdminMidnightVariantOptions()
}

/** Walk sheet URL for a variant; unknown ids fall back to midnight-default. */
export function getMidnightWalkSrc(id?: MidnightVariantId | string | null): string {
  if (id && isMidnightVariantId(id)) return WALK_SRC[id]
  return WALK_SRC[MIDNIGHT_DEFAULT_VARIANT_ID]
}

export function getMidnightVariantRenderTuning(
  id?: MidnightVariantId | string | null,
): MidnightVariantRenderTuning {
  if (id && isMidnightVariantId(id)) return RENDER_BY_ID[id]
  return MIDNIGHT_DEFAULT_RENDER_TUNING
}

export function formatMidnightVariantTuningDebug(
  id: MidnightVariantId,
  tuning: MidnightVariantRenderTuning,
): string {
  const r = tuning
  return [
    `variant: ${id}`,
    `insetTop D/U/L/R: ${r.frameInsetTopDown}/${r.frameInsetTopUp}/${r.frameInsetTopLeft}/${r.frameInsetTopRight}`,
    `frameInsetBottom: ${r.frameInsetBottom}`,
    `feetOffset: ${r.feetOffset}`,
    `drawShiftUp: ${r.drawShiftUp}`,
    `rowPad D/U/L/R: ${r.rowPaddingDown}/${r.rowPaddingUp}/${r.rowPaddingLeft}/${r.rowPaddingRight}`,
    `cropH D/U/L/R: ${r.cropHeightDown}/${r.cropHeightUp}/${r.cropHeightLeft}/${r.cropHeightRight}`,
  ].join('\n')
}
