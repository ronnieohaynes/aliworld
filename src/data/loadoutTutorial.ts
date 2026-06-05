import type { GuidedTutorialStep } from '../components/GuidedTutorialOverlay'

export type LoadoutTutorialTarget =
  | 'menu_button'
  | 'menu_loadout'
  | 'stat_attack'
  | 'stat_speed'
  | 'stat_defense'
  | 'stat_luck'
  | 'build'
  | 'share_card'

/** Steps 0–1: block overworld talk; UI targets (START, loadout) stay clickable. */
export function blocksWorldInteractDuringLoadoutTutorial(step: number | null): boolean {
  return step != null && step <= 1
}

export const LOADOUT_TUTORIAL_STEPS: readonly GuidedTutorialStep<
  LoadoutTutorialTarget | 'none'
>[] = [
  {
    text: "wow. you defeated your first opponent. let's show you what else.",
    target: 'none',
  },
  {
    text: 'open your home screen.',
    target: 'menu_button',
    waitForAction: true,
  },
  {
    text: 'this is your loadout.',
    target: 'menu_loadout',
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
    text: 'defense: braces and holds. guard more, take less.',
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
]
