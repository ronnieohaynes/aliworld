export type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  destroy: () => void
  getCurrentTime: () => number
  getPlayerState: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  mute?: () => void
  unMute?: () => void
  getVideoData?: () => { title?: string; author?: string; video_id?: string }
}

export type YTPlayerReadyEvent = { target: YTPlayer }
export type YTPlayerStateChangeEvent = { data: number; target: YTPlayer }

export type YTNamespace = {
  Player: new (
    elementId: string,
    options: {
      videoId: string
      playerVars?: Record<string, number | string>
      events?: {
        onReady?: (event: YTPlayerReadyEvent) => void
        onStateChange?: (event: YTPlayerStateChangeEvent) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let ytApiPromise: Promise<void> | null = null

/** Load the YouTube IFrame API once (safe to call repeatedly). */
export function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  ytApiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.head.appendChild(script)
  })
  return ytApiPromise
}

/** Warm the API during user interaction (e.g. cafe scene taps) before cutscene mount. */
export function preloadYouTubeIframeApi(): void {
  void loadYouTubeIframeApi()
}
