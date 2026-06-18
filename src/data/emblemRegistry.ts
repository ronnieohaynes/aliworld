import { publicAsset } from '../utils/publicAsset'

/** Flair markers — not variants, not seals. Shop + equip only. */
export type EmblemId = 'six5ive-mark' | 'wheel-spoke' | 'ali-sigil'

export type EmblemDef = {
  id: EmblemId
  name: string
  artSrc: string
}

export const EMBLEM_REGISTRY: Record<EmblemId, EmblemDef> = {
  'six5ive-mark': {
    id: 'six5ive-mark',
    name: 'six5ive mark',
    artSrc: publicAsset('Assets/ui/artifacts/six5ive-tee.png'),
  },
  'wheel-spoke': {
    id: 'wheel-spoke',
    name: 'wheel spoke',
    artSrc: publicAsset('Assets/ui/artifacts/wheel.png'),
  },
  'ali-sigil': {
    id: 'ali-sigil',
    name: 'ali sigil',
    artSrc: publicAsset('Assets/ui/AW%20GAME%20LOGO.svg'),
  },
}

export function getEmblemDef(id: EmblemId): EmblemDef {
  return EMBLEM_REGISTRY[id]
}

export function isEmblemId(value: string): value is EmblemId {
  return Object.prototype.hasOwnProperty.call(EMBLEM_REGISTRY, value)
}
