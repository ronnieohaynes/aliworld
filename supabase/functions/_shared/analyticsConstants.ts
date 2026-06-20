/** Mothership v2 metrics, events before this date are excluded from hours / first-to-milestone. */
export const ANALYTICS_V2_TRACKING_SINCE = '2026-06-16T00:00:00.000Z'

/** Gym head enemy ids, battle_end wins with these enemyId values count as gym wins. */
export const GYM_HEAD_ENEMY_IDS = ['5ive-gym1'] as const

/** Player combat level thresholds for player_level_milestone events. */
export const PLAYER_LEVEL_MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const

/** ~1 heartbeat per minute while the tab is visible. */
export const HEARTBEAT_MINUTES = 1
