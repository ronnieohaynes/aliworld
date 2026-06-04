import type { Caption } from '../data/episode1Captions'

export type { Caption }

/** ALIWORLD episode theater ids — respawn-to-5ive after playback when flagged. */
export const ALIWORLD_EPISODE_VIDEO_IDS = ['6t83Cdmq1fM'] as const

/** Options for {@link PlayCutsceneOptions} — consumed by GameScreen / CutsceneOverlay. */
export type PlayCutsceneOptions = {
  videoId: string
  startSeconds: number
  endSeconds: number
  onComplete: () => void
  /** When true, post-cutscene hold then respawn at The 5ive arrival spawn. */
  isEpisodeCutscene?: boolean
  /** Ms to keep overlay visible at 100% progress after onComplete (episode hold). */
  postCompleteHoldMs?: number
  /** Ms to fade remaining cutscene UI to full black after postCompleteHoldMs. */
  postCompleteFadeToBlackMs?: number
  /** Timestamps relative to clip start (seconds). */
  captions?: Caption[]
}
