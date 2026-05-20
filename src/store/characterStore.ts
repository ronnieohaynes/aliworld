import { MIDNIGHT_WALK_SRC } from '../constants/gameAssets'

export type SkinTone = 1 | 2 | 3 | 4 | 5 | 6

export type CharacterState = {
  /** Set only after the player picks a tone in the customization screen. */
  skinTone: SkinTone | null
}

export const SKIN_TONE_SWATCHES: ReadonlyArray<{ tone: SkinTone; color: string }> = [
  { tone: 1, color: '#F5C9A0' },
  { tone: 2, color: '#D4956A' },
  { tone: 3, color: '#B87848' },
  { tone: 4, color: '#8B5E3C' },
  { tone: 5, color: '#5C3317' },
  { tone: 6, color: '#3B1F0A' },
]

const BODY_BASE_SRC = '/Assets/Characters/base-body/male'

let characterState: CharacterState = { skinTone: null }
const listeners = new Set<() => void>()

export function getCharacterState(): CharacterState {
  return characterState
}

export function setSkinTone(skinTone: SkinTone): void {
  if (characterState.skinTone === skinTone) return
  characterState = { ...characterState, skinTone }
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeCharacterStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSkinToneWalkSrc(skinTone: SkinTone): string {
  return `${BODY_BASE_SRC}/tone${skinTone}-walk.png`
}

/** Walk sheet for overworld and store: Midnight until a skin tone is chosen. */
export function getPlayerWalkSrc(): string {
  if (characterState.skinTone === null) {
    return MIDNIGHT_WALK_SRC
  }
  return getSkinToneWalkSrc(characterState.skinTone)
}
