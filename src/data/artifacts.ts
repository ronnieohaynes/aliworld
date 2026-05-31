import { publicAsset } from '../utils/publicAsset'

const ARTIFACT_UI_DIR = publicAsset('Assets/ui/artifacts')

/** Artifacts shown in the Fanny Pack and tracked as collectibles. */
export type CollectibleArtifactId =
  | 'mp3-player'
  | 'subway-pass'
  | 'camera'
  | 'wheel'
  | 'doodle-ron'
  | 'six5ive-tee'

/** All artifact ids, including narrative-only entries excluded from the Fanny Pack. */
export type ArtifactId = CollectibleArtifactId | 'jacket'

export type CollectibleArtifactDef = {
  id: CollectibleArtifactId
  name: string
  iconSrc: string
  /** Default collection state for new saves. */
  collected: false
  showInFannyPack: true
}

export type ArtifactDef = CollectibleArtifactDef | {
  id: 'jacket'
  name: string
  iconSrc: string
  collected: false
  showInFannyPack: false
}

export const ARTIFACT_EMPTY_SLOT_SRC = `${ARTIFACT_UI_DIR}/empty-slot.png`

/** Fanny Pack slot order (6 collectibles). */
export const FANNY_PACK_ARTIFACTS: readonly CollectibleArtifactDef[] = [
  { id: 'mp3-player', name: 'MP3 Player', iconSrc: `${ARTIFACT_UI_DIR}/mp3-player.png`, collected: false, showInFannyPack: true },
  { id: 'subway-pass', name: 'Subway Pass', iconSrc: `${ARTIFACT_UI_DIR}/subway-pass.png`, collected: false, showInFannyPack: true },
  { id: 'camera', name: 'Camera', iconSrc: `${ARTIFACT_UI_DIR}/camera.png`, collected: false, showInFannyPack: true },
  { id: 'wheel', name: 'Wheel', iconSrc: `${ARTIFACT_UI_DIR}/wheel.png`, collected: false, showInFannyPack: true },
  { id: 'doodle-ron', name: 'Doodle Ron', iconSrc: `${ARTIFACT_UI_DIR}/doodle-ron.png`, collected: false, showInFannyPack: true },
  { id: 'six5ive-tee', name: 'Six5ive Tee', iconSrc: `${ARTIFACT_UI_DIR}/six5ive-tee.png`, collected: false, showInFannyPack: true },
] as const

/** Worn by MIDNIGHT throughout the game; surrendered at the mirror battle — not a Fanny Pack collectible. */
export const JACKET_ARTIFACT: ArtifactDef = {
  id: 'jacket',
  name: 'Jacket',
  iconSrc: `${ARTIFACT_UI_DIR}/jacket.png`,
  collected: false,
  showInFannyPack: false,
}

/** Full registry for narrative / finale logic. */
export const ALL_ARTIFACTS: readonly ArtifactDef[] = [...FANNY_PACK_ARTIFACTS, JACKET_ARTIFACT] as const

const COLLECTIBLE_IDS = FANNY_PACK_ARTIFACTS.map((a) => a.id)
const ALL_ARTIFACT_IDS = ALL_ARTIFACTS.map((a) => a.id)

export function isCollectibleArtifactId(value: string): value is CollectibleArtifactId {
  return (COLLECTIBLE_IDS as readonly string[]).includes(value)
}

export function isArtifactId(value: string): value is ArtifactId {
  return (ALL_ARTIFACT_IDS as readonly string[]).includes(value)
}

export function getArtifactDef(id: ArtifactId): ArtifactDef {
  return ALL_ARTIFACTS.find((a) => a.id === id)!
}

export function getArtifactIconSrc(id: ArtifactId): string {
  return `${ARTIFACT_UI_DIR}/${id}.png`
}

/** @deprecated Use FANNY_PACK_ARTIFACTS */
export const ARTIFACTS = FANNY_PACK_ARTIFACTS
