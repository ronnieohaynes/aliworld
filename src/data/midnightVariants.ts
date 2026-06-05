import { publicAsset } from '../utils/publicAsset'

const MIDNIGHT_DIR = publicAsset('Assets/Characters/midnight')

export type MidnightVariantId =
  | 'default'
  | 'asian-f'
  | 'latino-m'
  | 'white-f'
  | 'filipino-m'
  | 'danny-ali'

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

/** Shown on the creation carousel only — hidden admin-grant variants excluded. */
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

/** Registered for rendering + admin — not on the public select screen. */
const HIDDEN_MIDNIGHT_VARIANTS: readonly MidnightVariantDef[] = [
  { id: 'danny-ali', render: BASELINE_RENDER },
] as const

const ALL_MIDNIGHT_VARIANTS: readonly MidnightVariantDef[] = [
  ...MIDNIGHT_VARIANTS,
  ...HIDDEN_MIDNIGHT_VARIANTS,
]

const WALK_SRC: Record<MidnightVariantId, string> = {
  default: `${MIDNIGHT_DIR}/midnight-default.png`,
  'asian-f': `${MIDNIGHT_DIR}/midnight-asian-f.png`,
  'latino-m': `${MIDNIGHT_DIR}/midnight-latino-m.png`,
  'white-f': `${MIDNIGHT_DIR}/midnight-white-f.png`,
  'filipino-m': `${MIDNIGHT_DIR}/midnight-filipino-m.png`,
  'danny-ali': `${MIDNIGHT_DIR}/danny-ali.png`,
}

const RENDER_BY_ID = Object.fromEntries(
  ALL_MIDNIGHT_VARIANTS.map((v) => [v.id, v.render]),
) as Record<MidnightVariantId, MidnightVariantRenderTuning>

const SELECTABLE_IDS = new Set(MIDNIGHT_VARIANTS.map((v) => v.id))

export function isMidnightVariantId(value: string): value is MidnightVariantId {
  return Object.prototype.hasOwnProperty.call(WALK_SRC, value)
}

export function isSelectableMidnightVariantId(value: string): boolean {
  return isMidnightVariantId(value) && SELECTABLE_IDS.has(value as MidnightVariantId)
}

/** All variant ids for admin (selectable + hidden). */
export function listAllMidnightVariantOptions(): {
  id: MidnightVariantId
  label: string
  hidden: boolean
}[] {
  return ALL_MIDNIGHT_VARIANTS.map((v) => ({
    id: v.id,
    label: SELECTABLE_IDS.has(v.id) ? v.id : `${v.id} (hidden)`,
    hidden: !SELECTABLE_IDS.has(v.id),
  }))
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
