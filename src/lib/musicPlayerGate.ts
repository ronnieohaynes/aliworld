import { ADAM_MP3_ARTIFACT_ID } from '../data/adamMp3Handoff'
import { hasArtifact } from '../store/artifactStore'
import { hasMp3PlayerOwned } from '../store/quest1Store'

/** True after Adam's handoff (quest flag or fanny-pack artifact). */
export function isMusicPlayerOwned(): boolean {
  return hasMp3PlayerOwned() || hasArtifact(ADAM_MP3_ARTIFACT_ID)
}
