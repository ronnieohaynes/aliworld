import type { GuidedTutorialStep } from '../components/GuidedTutorialOverlay'

export type AdamTutorialTarget = 'fanny_pack_button' | 'none'

export const ADAM_TUTORIAL_STEPS: readonly GuidedTutorialStep<AdamTutorialTarget>[] = [
  {
    text: 'open your fanny pack to see what you got.',
    target: 'fanny_pack_button',
    waitForAction: true,
  },
  {
    text: "you'll learn the rest as you go.",
    target: 'none',
  },
]
