import type { Caption } from '../data/episode1Captions'

export type { Caption }

/** ALIWORLD episode theater ids, respawn-to-5ive after playback when flagged. */
export const ALIWORLD_EPISODE_VIDEO_IDS = ['6t83Cdmq1fM', 'y4WdKh9cZsM'] as const

/** Episode index for post-clip handoff (1 = cafe → E2 start, 2 = restocker closing → E3 teaser, …). */
export type EpisodeCutsceneHandoff = 1 | 2 | 3 | 4 | 5

/** Passed to cutscene {@link PlayCutsceneOptions.onComplete} when playback ends. */
export type CutsceneCompleteMeta = {
  /** User pressed skip — skip post-clip hold/fade and run episode handoff immediately. */
  userSkip?: boolean
}

/** Options for {@link PlayCutsceneOptions}, consumed by GameScreen / CutsceneOverlay. */
export type PlayCutsceneOptions = {
  videoId: string
  startSeconds: number
  endSeconds: number
  onComplete: (meta?: CutsceneCompleteMeta) => void
  /** When true, post-cutscene hold then respawn at The 5ive arrival spawn. */
  isEpisodeCutscene?: boolean
  /** Selects which episode handoff runs after the clip (sets played flag + transition). */
  episodeHandoff?: EpisodeCutsceneHandoff
  /** Ms to keep overlay visible at 100% progress after onComplete (episode hold). */
  postCompleteHoldMs?: number
  /** Ms to fade remaining cutscene UI to full black after postCompleteHoldMs. */
  postCompleteFadeToBlackMs?: number
  /** Timestamps relative to clip start (seconds). Omit when using YouTube captions. */
  captions?: Caption[]
  /** Show YouTube Studio captions in the embed (synced by YouTube). */
  youtubeCaptions?: boolean
  /** Label for the game-shell music bar (defaults to YouTube title when available). */
  videoTitle?: string
  /** Dev Shift+E+N preview — always replay post-clip title cards. */
  devEpisodePreview?: boolean
}
