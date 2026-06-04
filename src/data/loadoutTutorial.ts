import type { GuidedTutorialStep } from '../components/GuidedTutorialOverlay'

export type LoadoutTutorialTarget = 'menu_loadout' | 'skills' | 'equipped' | 'build'

export const LOADOUT_TUTORIAL_STEPS: readonly GuidedTutorialStep<LoadoutTutorialTarget | 'none'>[] =
  [
    {
      text: 'check your loadout.',
      target: 'menu_loadout',
    },
    {
      text: 'your skills grow as you use them.',
      target: 'skills',
    },
    {
      text: 'four moves active. tap to swap as you unlock more.',
      target: 'equipped',
    },
    {
      text: "this is who you're becoming. share the card.",
      target: 'build',
    },
    {
      text:
        'attack beats speed. speed beats luck. luck beats defense. defense beats attack. read them, pick right.',
      target: 'none',
    },
  ]
