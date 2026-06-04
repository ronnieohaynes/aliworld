import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import './BattleTutorialOverlay.css'

export type GuidedTutorialStep<T extends string> = {
  text: string
  target: T | 'none'
}

function padRect(rect: DOMRect, px: number): DOMRect {
  return new DOMRect(rect.x - px, rect.y - px, rect.width + px * 2, rect.height + px * 2)
}

type Props<T extends string> = {
  ariaLabel: string
  steps: readonly GuidedTutorialStep<T>[]
  stepIndex: number
  targetRefs: Partial<Record<T, RefObject<HTMLElement | null>>>
  scrollRootRef?: RefObject<HTMLElement | null>
  lastStepLabel?: string
  onNext: () => void
  onSkip: () => void
}

export function GuidedTutorialOverlay<T extends string>({
  ariaLabel,
  steps,
  stepIndex,
  targetRefs,
  scrollRootRef,
  lastStepLabel = 'done ▸',
  onNext,
  onSkip,
}: Props<T>) {
  const step = steps[stepIndex]!
  const [targetRects, setTargetRects] = useState<Partial<Record<T, DOMRect>>>({})

  const measureTargets = useCallback(() => {
    const next: Partial<Record<T, DOMRect>> = {}
    for (const key of Object.keys(targetRefs) as T[]) {
      const el = targetRefs[key]?.current
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
    const scrollEl = scrollRootRef?.current
    if (!scrollEl) return
    scrollEl.addEventListener('scroll', measureTargets, { passive: true })
    return () => scrollEl.removeEventListener('scroll', measureTargets)
  }, [measureTargets, scrollRootRef])

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
    step.target === 'none'
      ? null
      : targetRects[step.target]
        ? padRect(targetRects[step.target]!, 6)
        : null

  const isLastStep = stepIndex >= steps.length - 1

  return createPortal(
    <div
      className="battle-tutorial"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
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
            {isLastStep ? lastStepLabel : 'next ▸'}
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
