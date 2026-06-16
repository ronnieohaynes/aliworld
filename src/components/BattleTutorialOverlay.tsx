import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import './BattleTutorialOverlay.css'

export type BattleTutorialTarget = 'battle' | 'stage' | 'telegraph' | 'moves' | 'status' | 'plate' | 'statuslegend' | 'xpbar' | 'none'

export const BATTLE_TUTORIAL_STEPS: ReadonlyArray<{
  text: string
  target: BattleTutorialTarget
}> = [
  { text: 'this is a fight. you and them trade turns.', target: 'stage' },
  {
    text: "watch the telegraph. it tells you what they're about to do before they do it.",
    target: 'telegraph',
  },
  {
    text: 'these are your moves. STRIKE hits. SLIP dodges. HOLD braces. WHISPER hits on luck. the skill level next to each move grows as you use it.',
    target: 'moves',
  },
  {
    text: 'status effects show up here, bleed, shake, stun, and your brace.',
    target: 'statuslegend',
  },
  {
    text: 'that bar tracks your overall level. every move you throw builds it.',
    target: 'xpbar',
  },
  { text: "read the telegraph, then choose. go.", target: 'telegraph' },
]

type TargetRects = Partial<Record<BattleTutorialTarget, DOMRect>>

type Props = {
  stepIndex: number
  targetRefs: Record<Exclude<BattleTutorialTarget, 'none'>, RefObject<HTMLElement | null>>
  onNext: () => void
  onSkip: () => void
  stepsOverride?: ReadonlyArray<{ text: string; target: BattleTutorialTarget }>
}

const DIM = 'rgba(8, 8, 14, 0.82)'

function padRect(rect: DOMRect, px: number): DOMRect {
  return new DOMRect(rect.x - px, rect.y - px, rect.width + px * 2, rect.height + px * 2)
}

/** Four panels that cover everything outside the spotlight rect. */
function DimPanels({ rect }: { rect: DOMRect }) {
  const { top, left, right, bottom, width, height } = {
    top: rect.top,
    left: rect.left,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    width: rect.width,
    height: rect.height,
  }
  const panel: CSSProperties = { position: 'fixed', background: DIM, pointerEvents: 'auto' }
  return (
    <>
      {/* above */}
      <div style={{ ...panel, top: 0, left: 0, right: 0, height: top }} aria-hidden />
      {/* left */}
      <div style={{ ...panel, top, left: 0, width: left, height }} aria-hidden />
      {/* right */}
      <div style={{ ...panel, top, left: right, right: 0, height }} aria-hidden />
      {/* below */}
      <div style={{ ...panel, top: bottom, left: 0, right: 0, bottom: 0 }} aria-hidden />
      {/* purple outline ring over the hole */}
      <div
        className="battle-tutorial__spotlight-ring"
        style={{ top, left, width, height }}
        aria-hidden
      />
    </>
  )
}

export function BattleTutorialOverlay({
  stepIndex,
  targetRefs,
  onNext,
  onSkip,
  stepsOverride,
}: Props) {
  const steps = stepsOverride ?? BATTLE_TUTORIAL_STEPS
  const step = steps[stepIndex]!
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

  const isLastStep = stepIndex >= steps.length - 1

  // Move panel to top when the spotlight is in the lower portion of the screen.
  const panelAboveTarget =
    highlightRect != null && highlightRect.top > window.innerHeight * 0.4

  return createPortal(
    <div
      className={`battle-tutorial${panelAboveTarget ? ' battle-tutorial--panel-top' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="how to fight"
      onClick={onNext}
    >
      {highlightRect ? (
        <DimPanels rect={highlightRect} />
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
