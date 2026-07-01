/**
 * Full save reset, used by START menu "New Game" confirmation.
 */

import { resetArtifactsForDebug } from './artifactStore'
import { clearMidnightVariant } from './characterStore'
import { resetMusicPlayerForNewGame } from '../lib/audioManager'
import { resetPatchesForDebug } from './patchesStore'
import { resetPlayerProgressForNewGame } from './playerStore'
import { resetQuest1ForDebug } from './quest1Store'
import { resetQuest2ForDebug } from './quest2Store'
import { resetQuest3ForDebug } from './quest3Store'

/** Wipe all persisted progress and return to MIDNIGHT variant select (via clearMidnightVariant). */
export function performNewGameReset(): void {
  resetArtifactsForDebug()
  resetQuest1ForDebug()
  resetQuest2ForDebug()
  resetQuest3ForDebug()
  resetPatchesForDebug()
  resetPlayerProgressForNewGame()
  resetMusicPlayerForNewGame()
  clearMidnightVariant()
}
