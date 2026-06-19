import type { Caption } from './episode1Captions'
import type { EpisodeCutsceneHandoff, PlayCutsceneOptions, CutsceneCompleteMeta } from '../lib/playCutscene'

export type EpisodeCutscenePreset = {
  videoId: string
  startSeconds: number
  endSeconds: number
  /** YouTube video title shown in the game-shell music bar during playback. */
  videoTitle: string
  youtubeCaptions?: boolean
  captions?: Caption[]
}

/** Shipped episode theater clips (extend as episodes ship). */
export const EPISODE_CUTSCENE_PRESETS: Record<1 | 2, EpisodeCutscenePreset> = {
  1: {
    videoId: '6t83Cdmq1fM',
    startSeconds: 74,
    endSeconds: 204,
    videoTitle: 'ALIWORLD EP. 1: "THE NORMAL?" | a cinematic rap series.',
    youtubeCaptions: true,
  },
  2: {
    videoId: 'y4WdKh9cZsM',
    startSeconds: 0,
    endSeconds: 184,
    videoTitle: 'ALIWORLD EP. 2: "THE SEQUENCE?" | a cinematic rap series.',
    youtubeCaptions: true,
  },
}

export function buildEpisodeCutsceneOptions(
  handoff: Extract<EpisodeCutsceneHandoff, 1 | 2>,
  onComplete: (meta?: CutsceneCompleteMeta) => void = () => {},
): PlayCutsceneOptions {
  const preset = EPISODE_CUTSCENE_PRESETS[handoff]
  return {
    videoId: preset.videoId,
    startSeconds: preset.startSeconds,
    endSeconds: preset.endSeconds,
    videoTitle: preset.videoTitle,
    captions: preset.captions,
    youtubeCaptions: preset.youtubeCaptions,
    episodeHandoff: handoff,
    isEpisodeCutscene: true,
    onComplete,
  }
}
