import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import './BattleTutorialOverlay.css'

export type BattleTutorialTarget = 'battle' | 'telegraph' | 'moves' | 'status' | 'none'

export const BATTLE_TUTORIAL_STEPS: ReadonlyArray<{
  text: string
  target: BattleTutorialTarget
}> = [
  {
    text: "the ▲ button talks. walk up to someone and press it — on phone, that's tap-to-talk.",
    target: 'none',
  },
  { text: 'this is a fight. you and them trade turns.', target: 'battle' },
  {
    text: "watch the telegraph. it tells you what they're about to do.",
    target: 'telegraph',
  },
  { text: 'these are your moves.', target: 'moves' },
  {
    text: 'STRIKE hits. SLIP dodges. HOLD braces. WHISPER hits on luck.',
    target: 'moves',
  },
  {
    text: 'status effects show here — bleed, shake, stun, and your brace.',
    target: 'status',
  },
  { text: "read what's coming, then choose. go.", target: 'none' },
]

type TargetRects = Partial<Record<BattleTutorialTarget, DOMRect>>

type Props = {
  stepIndex: number
  targetRefs: Record<Exclude<BattleTutorialTarget, 'none'>, RefObject<HTMLElement | null>>
  onNext: () => void
  onSkip: () => void
}

function padRect(rect: DOMRect, px: number): DOMRect {
  return new DOMRect(rect.x - px, rect.y - px, rect.width + px * 2, rect.height + px * 2)
}

export function BattleTutorialOverlay({ stepIndex, targetRefs, onNext, onSkip }: Props) {
  const step = BATTLE_TUTORIAL_STEPS[stepIndex]!
  const [targetRects, setTargetRects] = useState<TargetRects>({})

  const measureTargets = useCallback(() => {
    const next: TargetRects = {}
    for (const key of Object.keys(targetRefs) as Exclude<BattleTutorialTarget, 'none'>[]) {
      const el = targetRefs[key].current
      if (el) next[key] = el.getBoundingClientRect()
    }
    setTargetRects(next)
  }, [targetRefs])

  useLayoutEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measureTargets)
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [measureTargets, stepIndex])

  useEffect(() => {
    const t1 = window.setTimeout(measureTargets, 120)
    const t2 = window.setTimeout(measureTargets, 360)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [measureTargets])

  useEffect(() => {
    window.addEventListener('resize', measureTargets)
    return () => window.removeEventListener('resize', measureTargets)
  }, [measureTargets])

  useEffect(() => {
    const battleEl = targetRefs.battle.current
    if (!battleEl) return
    battleEl.addEventListener('scroll', measureTargets, { passive: true })
    return () => battleEl.removeEventListener('scroll', measureTargets)
  }, [measureTargets, targetRefs.battle])

  useEffect(() => {
    if (document.fonts?.ready) {
      void document.fonts.ready.then(measureTargets)
    }
  }, [measureTargets])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }
      e.preventDefault()
      onNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onNext])

  const highlightRect =
    step.target === 'none' ? null : targetRects[step.target]
      ? padRect(targetRects[step.target]!, 6)
      : null

  const isLastStep = stepIndex >= BATTLE_TUTORIAL_STEPS.length - 1

  return createPortal(
    <div
      className="battle-tutorial"
      role="dialog"
      aria-modal="true"
      aria-label="how to fight"
      onClick={onNext}
    >
      {highlightRect ? (
        <div
          className="battle-tutorial__spotlight"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
          aria-hidden
        />
      ) : (
        <div className="battle-tutorial__dim-full" aria-hidden />
      )}

      <div
        className="battle-tutorial__panel"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <p className="battle-tutorial__text">{step.text}</p>
        <div className="battle-tutorial__actions">
          <button type="button" className="battle-tutorial__next" onClick={onNext}>
            {isLastStep ? 'go ▸' : 'next ▸'}
          </button>
          <button type="button" className="battle-tutorial__skip" onClick={onSkip}>
            skip
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
