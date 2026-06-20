/**
 * Character appearance store, MDNGHT variant (V1) + skin tone stubs (V2 CustomizationScreen).
 */

import {
  getMidnightWalkSrc,
  isMidnightVariantId,
  MIDNIGHT_DEFAULT_VARIANT_ID,
  type MidnightVariantId,
} from '../data/midnightVariants'
import { publicAsset } from '../utils/publicAsset'

export type SkinTone = 1 | 2 | 3 | 4 | 5 | 6

export const DEFAULT_CUSTOMIZATION_PREVIEW_TONE: SkinTone = 3

export type CharacterState = {
  hasCustomized: boolean
  skinTone: SkinTone | null
  midnightVariant: MidnightVariantId | null
}

export const SKIN_TONE_SWATCHES: ReadonlyArray<{ tone: SkinTone; color: string }> = [
  { tone: 1, color: '#F5C9A0' },
  { tone: 2, color: '#D4956A' },
  { tone: 3, color: '#B87848' },
  { tone: 4, color: '#8B5E3C' },
  { tone: 5, color: '#5C3317' },
  { tone: 6, color: '#3B1F0A' },
]

const MIDNIGHT_VARIANT_STORAGE_KEY = 'aliworld:midnight-variant:v1'

const BODY_BASE_SRC = publicAsset('Assets/Characters/base-body/male')

const SKIN_TONE_IDLE_SRC: Record<SkinTone, string> = {
  1: `${BODY_BASE_SRC}/tone1-Idle.png`,
  2: `${BODY_BASE_SRC}/tone2-idle.png`,
  3: `${BODY_BASE_SRC}/tone3-idle.png`,
  4: `${BODY_BASE_SRC}/tone4-idle.png`,
  5: `${BODY_BASE_SRC}/tone5-idle.png`,
  6: `${BODY_BASE_SRC}/tone6-idle.png`,
}

function loadMidnightVariantFromStorage(): MidnightVariantId | null {
  try {
    const raw = localStorage.getItem(MIDNIGHT_VARIANT_STORAGE_KEY)
    if (!raw || !isMidnightVariantId(raw)) return null
    return raw
  } catch {
    return null
  }
}

function saveMidnightVariantToStorage(id: MidnightVariantId | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(MIDNIGHT_VARIANT_STORAGE_KEY)
    } else {
      localStorage.setItem(MIDNIGHT_VARIANT_STORAGE_KEY, id)
    }
  } catch {
    // storage unavailable
  }
}

let state: CharacterState = {
  hasCustomized: false,
  skinTone: null,
  midnightVariant: loadMidnightVariantFromStorage(),
}

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function getCharacterState(): CharacterState {
  return state
}

export function getMidnightVariant(): MidnightVariantId | null {
  return state.midnightVariant
}

/** Selected cosmetic MDNGHT variant (null = show select screen). */
export function getSelectedMidnightVariant(): MidnightVariantId | null {
  return state.midnightVariant
}

export function hasSelectedMidnightVariant(): boolean {
  return state.midnightVariant !== null
}

/** Persist selection and enter the game (V1, no in-game re-pick). */
export function setMidnightVariant(id: MidnightVariantId): void {
  state = { ...state, midnightVariant: id }
  saveMidnightVariantToStorage(id)
  emit()
  void import('./playerStore').then(({ triggerAccountProgressionSave }) => {
    triggerAccountProgressionSave()
  })
}

/** Apply variant loaded from account save (hydrate) without triggering a write-back. */
export function applyMidnightVariantFromAccount(id: MidnightVariantId): void {
  state = { ...state, midnightVariant: id }
  saveMidnightVariantToStorage(id)
  emit()
}

/** Clear saved pick so App shows the select screen again (debug / re-test). */
export function clearMidnightVariant(): void {
  state = { ...state, midnightVariant: null }
  saveMidnightVariantToStorage(null)
  emit()
}

/** Reset cosmetic picks on sign-out so the next account starts clean. */
export function resetCharacterForSignOut(): void {
  state = {
    hasCustomized: false,
    skinTone: null,
    midnightVariant: null,
  }
  saveMidnightVariantToStorage(null)
  emit()
}

/** @deprecated Use clearMidnightVariant */
export const clearMidnightVariantForDebug = clearMidnightVariant

export function hasCustomizedCharacter(): boolean {
  return false
}

export function setSkinTone(_skinTone: SkinTone): void {}
export function completeCustomization(): void {}

export function subscribeCharacterStore(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
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
  return getMidnightWalkSrc(MIDNIGHT_DEFAULT_VARIANT_ID)
}
