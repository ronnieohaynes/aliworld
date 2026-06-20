import type { GuidedTutorialStep } from '../components/GuidedTutorialOverlay'

export type LoadoutTutorialTarget =
  | 'menu_button'
  | 'script_button'
  | 'stat_attack'
  | 'stat_speed'
  | 'stat_defense'
  | 'stat_luck'
  | 'skill_xp'
  | 'build'
  | 'share_card'

/** Steps 0–1 and 9–10 block overworld talk while the script-button prompt is active. */
export function blocksWorldInteractDuringLoadoutTutorial(step: number | null): boolean {
  return step != null && (step <= 1 || step === 10)
}

export const LOADOUT_TUTORIAL_STEPS: readonly GuidedTutorialStep<
  LoadoutTutorialTarget | 'none'
>[] = [
  // ── Phase 2: post-Walker loadout intro (steps 0–8) ──
  {
    text: "wow. you defeated your first opponent. let's show you what else.",
    target: 'none',
  },
  {
    text: 'open your loadout here.',
    target: 'script_button',
    waitForAction: true,
  },
  {
    text: 'attack: how hard you hit. swing more, hit harder.',
    target: 'stat_attack',
    highlight: 'attack',
  },
  {
    text: 'speed: dodges and counters. slip more, get faster.',
    target: 'stat_speed',
    highlight: 'speed',
  },
  {
    text: 'defense: blocks and counters. parry more, take less and hit back harder.',
    target: 'stat_defense',
    highlight: 'defense',
  },
  {
    text: 'luck: the weird stuff. whispers, snags, coin flips. lean in and it leans back.',
    target: 'stat_luck',
    highlight: 'luck',
  },
  {
    text: "your skills shape what you become. the name changes as you grow.",
    target: 'build',
  },
  {
    text: 'this is your card. show them who you are.',
    target: 'share_card',
  },
  {
    text:
      'attack beats speed. speed beats luck. luck beats defense. defense beats attack. read them. pick right.',
    target: 'none',
  },

  // ── XP tutorial: post-Mark (steps 9–11) ──
  {
    text: "every move you throw earns XP. that's how your skills grow.",
    target: 'none',
  },
  {
    text: 'open your loadout to see it.',
    target: 'script_button',
    waitForAction: true,
  },
  {
    text: 'this bar tracks your XP toward the next level. keep fighting.',
    target: 'skill_xp',
    highlight: 'attack',
  },
]

/** Step index where the post-Mark XP tutorial begins. */
export const XP_TUTORIAL_START_STEP = 9

/** No start-menu exception needed, loadout opens directly via the script button. */
export function allowsStartMenuDuringLoadoutTutorial(_step: number | null): boolean {
  return false
}
