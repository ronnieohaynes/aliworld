import { mergeGrids } from './mergeGrids'
import {
  ACCESSORY_CATEGORIES,
  AVATAR_BASE,
  FACE_CATEGORIES,
} from './avatarData'
import type { AccessoryId, FaceCategoryId, StatId } from './types'

/** Paint order: face structure → skin → eyes → mouth → brows → hair → accessories */
export const FACE_MERGE_ORDER: FaceCategoryId[] = ['face', 'skin', 'eyes', 'mouth', 'brows', 'hair']

export const ACCESSORY_MERGE_ORDER: AccessoryId[] = ['hat', 'eyeGear', 'faceGear', 'neck', 'extra']

function pickFace(cat: FaceCategoryId, optionId: string) {
  const c = FACE_CATEGORIES.find((x) => x.id === cat)
  return c?.options.find((o) => o.id === optionId)
}

function pickAcc(cat: AccessoryId, optionId: string) {
  const c = ACCESSORY_CATEGORIES.find((x) => x.id === cat)
  return c?.options.find((o) => o.id === optionId)
}

export function buildMergedGrid(
  face: Record<FaceCategoryId, string>,
  acc: Record<AccessoryId, string>,
): string[] {
  const layers: (readonly string[])[] = [AVATAR_BASE]
  for (const id of FACE_MERGE_ORDER) {
    const o = pickFace(id, face[id])
    if (o) layers.push(o.overlay)
  }
  for (const id of ACCESSORY_MERGE_ORDER) {
    const o = pickAcc(id, acc[id])
    if (o) layers.push(o.overlay)
  }
  return mergeGrids(layers)
}

/** Rows 0–8: head / neck only (no jacket), for compositing onto the MDNGHT body sprite. */
const MDNGHT_HEAD_ROW_EXCLUSIVE = 9

export function buildMdnghtHeadGrid(
  face: Record<FaceCategoryId, string>,
  acc: Record<AccessoryId, string>,
): readonly string[] {
  const full = buildMergedGrid(face, acc)
  return full.slice(0, MDNGHT_HEAD_ROW_EXCLUSIVE)
}

const ZERO: Record<StatId, number> = {
  HP: 0,
  Attack: 0,
  Defense: 0,
  Speed: 0,
  Luck: 0,
}

export function sumAvatarStats(
  face: Record<FaceCategoryId, string>,
  acc: Record<AccessoryId, string>,
): Record<StatId, number> {
  const out = { ...ZERO }
  for (const id of FACE_MERGE_ORDER) {
    const o = pickFace(id, face[id])
    if (o?.bonus) out[o.stat] += o.bonus
  }
  for (const id of ACCESSORY_MERGE_ORDER) {
    const o = pickAcc(id, acc[id])
    if (o?.bonus) out[o.stat] += o.bonus
  }
  return out
}
