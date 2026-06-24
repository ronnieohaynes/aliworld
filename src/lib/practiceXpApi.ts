import {
  PRACTICE_COMBAT_XP_DAILY_CAP,
  PRACTICE_COMBAT_XP_DIMINISHED_MULT,
  PRACTICE_COMBAT_XP_SOFT_OVERFLOW,
  practiceXpBudgetFromServer,
  type PracticeXpBudget,
} from '../data/practiceDailyReset'
import { supabase } from './supabaseClient'

export type PracticeXpStatusResponse = {
  dayKey: string
  xpToday: number
  dailyCap: number
  diminishedMult: number
  softOverflow: number
  atCap: boolean
}

export type PracticeXpRecordResponse = PracticeXpStatusResponse & {
  xpEarned: number
  granted: number
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('practice-xp', { body })
  if (error) throw error
  if (!data || typeof data !== 'object') throw new Error('Invalid practice-xp response')
  if ('error' in data && typeof (data as { error?: string }).error === 'string') {
    throw new Error((data as { error: string }).error)
  }
  return data as T
}

export async function fetchPracticeXpStatus(): Promise<PracticeXpBudget> {
  try {
    const data = await post<PracticeXpStatusResponse>({ action: 'status' })
    return practiceXpBudgetFromServer(data.xpToday, data.dayKey)
  } catch (err) {
    console.warn('[practice-xp] status fallback', err instanceof Error ? err.message : String(err))
    return practiceXpBudgetFromServer(0)
  }
}

export async function recordPracticeBattleXp(xpEarned: number): Promise<PracticeXpRecordResponse> {
  const data = await post<PracticeXpRecordResponse>({
    action: 'record_battle',
    xpEarned: Math.max(0, Math.floor(xpEarned)),
  })
  return data
}

export function practiceXpCapConstants() {
  return {
    dailyCap: PRACTICE_COMBAT_XP_DAILY_CAP,
    diminishedMult: PRACTICE_COMBAT_XP_DIMINISHED_MULT,
    softOverflow: PRACTICE_COMBAT_XP_SOFT_OVERFLOW,
  }
}
