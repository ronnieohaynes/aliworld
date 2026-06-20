import { supabase } from './supabaseClient'

export type GymWeekRewardRequest = {
  weekId: string
  streak: number
}

export type GymWeekRewardResponse = {
  granted: boolean
  badgeValue?: string
  streakBadges?: string[]
  alreadyHad?: boolean
}

function rewardEndpoint(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  if (!base) throw new Error('Missing VITE_SUPABASE_URL')
  return `${base.replace(/\/$/, '')}/functions/v1/gym-week-reward`
}

/** Award weekly gym badge (+ streak milestones) after a full current-week clear. */
export async function claimGymWeekReward(
  payload: GymWeekRewardRequest,
): Promise<GymWeekRewardResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sign in required to claim gym rewards')
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!anonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY')

  const res = await fetch(rewardEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let message = `Gym reward request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return (await res.json()) as GymWeekRewardResponse
}
