import { isWalkerHeavyTutorialBeatSeen } from '../store/quest1Store'

/** First walker fight, scripted HAYMAKER on turn 2 until the read beat completes. */
export function isWalkerHeavyTutorialActive(npcId: string): boolean {
  if (npcId !== 'walker') return false
  return !isWalkerHeavyTutorialBeatSeen()
}
