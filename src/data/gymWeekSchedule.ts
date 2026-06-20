/** Re-export canonical gym week schedule (shared with edge functions). */
export {
  formatGymWeekCountdown,
  getAbsoluteWeekIndex,
  getGymWeekCountdownTargetMs,
  getGymWeekDeadlineMs,
  getGymWeekPhase,
  getGymWeekRemainingMs,
  getGymWeekStartMs,
  getGymWeekWindow,
  GYM_WEEK_DEADLINE_HOUR,
  GYM_WEEK_FIRST_DEADLINE_MS,
  GYM_WEEK_TIMEZONE,
  isGymWeekScoringOpen,
  MS_PER_GYM_WEEK,
  type GymWeekPhase,
  type GymWeekWindow,
} from '../../supabase/functions/_shared/gymWeekSchedule.ts'
