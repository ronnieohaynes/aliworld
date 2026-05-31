import { publicAsset } from '../utils/publicAsset'

const MIDNIGHT_DIR = publicAsset('Assets/Characters/midnight')

export type MidnightVariantId =
  | 'default'
  | 'asian-f'
  | 'latino-m'
  | 'white-f'
  | 'filipino-m'

export type MidnightVariantDef = {
  id: MidnightVariantId
}

export const MIDNIGHT_DEFAULT_VARIANT_ID: MidnightVariantId = 'default'

export const MIDNIGHT_VARIANTS: readonly MidnightVariantDef[] = [
  { id: 'default' },
  { id: 'asian-f' },
  { id: 'latino-m' },
  { id: 'white-f' },
  { id: 'filipino-m' },
] as const

const WALK_SRC: Record<MidnightVariantId, string> = {
  default: `${MIDNIGHT_DIR}/midnight-default.png`,
  'asian-f': `${MIDNIGHT_DIR}/midnight-asian-f.png`,
  'latino-m': `${MIDNIGHT_DIR}/midnight-latino-m.png`,
  'white-f': `${MIDNIGHT_DIR}/midnight-white-f.png`,
  'filipino-m': `${MIDNIGHT_DIR}/midnight-filipino-m.png`,
}

export function isMidnightVariantId(value: string): value is MidnightVariantId {
  return MIDNIGHT_VARIANTS.some((v) => v.id === value)
}

/** Walk sheet URL for a variant; unknown ids fall back to midnight-default. */
export function getMidnightWalkSrc(id?: MidnightVariantId | string | null): string {
  if (id && isMidnightVariantId(id)) return WALK_SRC[id]
  return WALK_SRC[MIDNIGHT_DEFAULT_VARIANT_ID]
}
