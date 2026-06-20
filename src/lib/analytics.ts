import { supabase } from './supabaseClient'

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/** Random per app load, groups events into one play session. */
const sessionId = createSessionId()

export function getAnalyticsSessionId(): string {
  return sessionId
}

/**
 * Fire-and-forget event log insert. Never throws; never blocks gameplay.
 * Pre-login events use null user_id (RLS allows insert when both are null).
 */
export function track(event: string, props?: Record<string, unknown>): void {
  void sendEvent(event, props)
}

/**
 * Progress-critical analytics helper. Use for events that should feed retroactive
 * badges/seals so they can be derived from history later.
 */
export function trackProgressEvent(event: string, props?: Record<string, unknown>): void {
  track(event, {
    progress_tracking: true,
    ...props,
  })
}

async function sendEvent(event: string, props?: Record<string, unknown>): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const metadata = {
      event_schema: 'v2',
      client_ts: new Date().toISOString(),
      session_id: sessionId,
      ...props,
    }

    const { error } = await supabase.from('aw_events').insert({
      user_id: session?.user?.id ?? null,
      event_type: event,
      metadata,
    })

    if (error) {
      console.debug('[analytics]', event, error.message)
    }
  } catch {
    // analytics must never affect gameplay
  }
}

/** Funnel, tip jar, streams, merch, etc. */
export function trackExternalLinkClick(destination: string): void {
  track('external_link_click', { destination })
}

/** Theater surface (wire when the feature ships). */
export function trackTheaterOpen(): void {
  track('theater_open')
}

/** @deprecated use trackLibraryPlay */
export function trackTheaterVideoPlay(videoId: string): void {
  track('library_play', { videoId })
}

export function trackPremiereAttend(
  premiereId: string,
  props?: { rewardXp?: number; skinGranted?: string; offline?: boolean },
): void {
  track('premiere_attend', { premiereId, ...props })
}

export function trackLibraryPlay(
  videoId: string,
  props?: { libraryId?: string; title?: string; featured?: boolean },
): void {
  track('library_play', { videoId, ...props })
}

export function trackShareAction(what: string): void {
  track('share_action', { what })
}
