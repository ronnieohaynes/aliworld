/**
 * Full save reset — used by START menu "New Game" confirmation.
 */

import { resetArtifactsForDebug } from './artifactStore'
import { clearMidnightVariant } from './characterStore'
import { stopSoundtrack } from './musicStore'
import { resetPlayerProgressForNewGame } from './playerStore'
import { resetQuest1ForDebug } from './quest1Store'

/** Wipe all persisted progress and return to MIDNIGHT variant select (via clearMidnightVariant). */
export function performNewGameReset(): void {
  resetArtifactsForDebug()
  resetQuest1ForDebug()
  resetPlayerProgressForNewGame()
  stopSoundtrack()
  clearMidnightVariant()
}
