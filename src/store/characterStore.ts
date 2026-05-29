/**
 * Character customization store — DISABLED for V1.1.
 * Exports are retained so CustomizationScreen.tsx (kept for V2) still compiles.
 * Nothing in the active V1.1 game imports from this module.
 */

import { MIDNIGHT_WALK_SRC } from '../constants/gameAssets'
import { publicAsset } from '../utils/publicAsset'

export type SkinTone = 1 | 2 | 3 | 4 | 5 | 6

export const DEFAULT_CUSTOMIZATION_PREVIEW_TONE: SkinTone = 3

export type CharacterState = {
  hasCustomized: boolean
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

const BODY_BASE_SRC = publicAsset('Assets/Characters/base-body/male')

const SKIN_TONE_IDLE_SRC: Record<SkinTone, string> = {
  1: `${BODY_BASE_SRC}/tone1-Idle.png`,
  2: `${BODY_BASE_SRC}/tone2-idle.png`,
  3: `${BODY_BASE_SRC}/tone3-idle.png`,
  4: `${BODY_BASE_SRC}/tone4-idle.png`,
  5: `${BODY_BASE_SRC}/tone5-idle.png`,
  6: `${BODY_BASE_SRC}/tone6-idle.png`,
}

export function getCharacterState(): CharacterState {
  return { hasCustomized: false, skinTone: null }
}

export function hasCustomizedCharacter(): boolean {
  return false
}

export function setSkinTone(_skinTone: SkinTone): void {}
export function completeCustomization(): void {}

export function subscribeCharacterStore(listener: () => void): () => void {
  void listener
  return () => {}
}

export function getEffectiveSkinTone(): SkinTone {
  return 1
}

export function getCustomizationPreviewTone(): SkinTone {
  return DEFAULT_CUSTOMIZATION_PREVIEW_TONE
}

export function getSkinToneFullSrc(skinTone: SkinTone): string {
  return `${BODY_BASE_SRC}/tone${skinTone}-full.png`
}

export function getSkinToneWalkSrc(skinTone: SkinTone): string {
  return `${BODY_BASE_SRC}/tone${skinTone}-walk.png`
}

export function getSkinToneIdleSrc(skinTone: SkinTone): string {
  return SKIN_TONE_IDLE_SRC[skinTone]
}

export function getDefaultMidnightWalkSrc(): string {
  return MIDNIGHT_WALK_SRC
}
