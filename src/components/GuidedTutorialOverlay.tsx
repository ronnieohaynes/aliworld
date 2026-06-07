import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import './BattleTutorialOverlay.css'

export type TutorialHighlightColor = 'default' | 'attack' | 'speed' | 'defense' | 'luck'

export type GuidedTutorialStep<T extends string> = {
  text: string
  target: T | 'none'
  waitForAction?: boolean
  highlight?: TutorialHighlightColor
}

const HIGHLIGHT_COLORS: Record<TutorialHighlightColor, string> = {
  default: '#c084fc',
  attack: '#cc4444',
  speed: '#44cc66',
  defense: '#4488cc',
  luck: '#cc44cc',
}

function padRect(rect: DOMRect, px: number): DOMRect {
  return new DOMRect(rect.x - px, rect.y - px, rect.width + px * 2, rect.height + px * 2)
}

const DIM_RGBA = 'rgba(8, 8, 14, 0.78)'

/**
 * Renders only the purple spotlight ring around a button — no dim, no panel.
 * Use during NPC dialogue to highlight a button without blocking interaction.
 */
export function ButtonSpotlightRing({
  targetRef,
}: {
  targetRef: RefObject<HTMLElement | null>
}) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const el = targetRef.current
    if (!el) return
    const measure = () => setRect(el.getBoundingClientRect())
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [targetRef])

  if (!rect) return null
  const pad = 6
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        border: `2px solid ${HIGHLIGHT_COLORS.default}`,
        borderRadius: 6,
        boxShadow: `0 0 12px ${HIGHLIGHT_COLORS.default}66`,
        pointerEvents: 'none',
        zIndex: 10003,
      }}
      aria-hidden
    />,
    document.body,
  )
}

/** Four fixed panels around the hole so the highlighted UI stays clickable. */
function TutorialDimPanels({ rect, borderColor }: { rect: DOMRect; borderColor: string }) {
  const top = rect.top
  const left = rect.left
  const width = rect.width
  const height = rect.height
  const right = left + width
  const bottom = top + height
  const panel: CSSProperties = {
    position: 'fixed',
    background: DIM_RGBA,
    pointerEvents: 'auto',
  }

  return (
    <>
      <div style={{ ...panel, top: 0, left: 0, right: 0, height: top }} aria-hidden />
      <div style={{ ...panel, top, left: 0, width: left, height }} aria-hidden />
      <div style={{ ...panel, top, left: right, right: 0, height }} aria-hidden />
      <div style={{ ...panel, top: bottom, left: 0, right: 0, bottom: 0 }} aria-hidden />
      <div
        className="battle-tutorial__spotlight-ring"
        style={{
          top,
          left,
          width,
          height,
          borderColor,
          boxShadow: `0 0 12px ${borderColor}66`,
        }}
        aria-hidden
      />
    </>
  )
}

type Props<T extends string> = {
  ariaLabel: string
  steps: readonly GuidedTutorialStep<T>[]
  stepIndex: number
  targetRefs: Partial<Record<T, RefObject<HTMLElement | null>>>
  scrollRootRef?: RefObject<HTMLElement | null>
  lastStepLabel?: string
  elevated?: boolean
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
  elevated = false,
  onNext,
  onSkip,
}: Props<T>) {
  const step = steps[stepIndex]!
  const waitForAction = step.waitForAction === true
  const highlightColor = HIGHLIGHT_COLORS[step.highlight ?? 'default']
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
    if (waitForAction) return
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
  }, [onNext, waitForAction])

  const highlightRect =
    step.target === 'none'
      ? null
      : targetRefs[step.target]?.current && targetRects[step.target]
        ? padRect(targetRects[step.target]!, 6)
        : null

  const isLastStep = stepIndex >= steps.length - 1

  const panelAboveTarget =
    highlightRect != null && highlightRect.top > window.innerHeight * 0.42

  const handleBackdropClick = () => {
    if (waitForAction) return
    onNext()
  }

  /** Always pass clicks to game UI on wait steps; dim panels only when the hole is measured. */
  const passThroughHole = waitForAction

  return createPortal(
    <div
      className={`battle-tutorial${elevated ? ' battle-tutorial--elevated' : ''}${
        panelAboveTarget ? ' battle-tutorial--panel-top' : ''
      }${passThroughHole ? ' battle-tutorial--pass-through' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={passThroughHole ? undefined : handleBackdropClick}
    >
      {passThroughHole && highlightRect ? (
        <TutorialDimPanels rect={highlightRect} borderColor={highlightColor} />
      ) : highlightRect ? (
        <div
          className="battle-tutorial__spotlight"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            borderColor: highlightColor,
            boxShadow: `0 0 0 9999px ${DIM_RGBA}, 0 0 12px ${highlightColor}66`,
          }}
          aria-hidden
        />
      ) : (
        <div className="battle-tutorial__dim-full" aria-hidden />
      )}

      <div
        className="battle-tutorial__panel"
        style={passThroughHole ? { pointerEvents: 'auto' } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <p className="battle-tutorial__text">{step.text}</p>
        <div className="battle-tutorial__actions">
          {waitForAction ? (
            <span className="battle-tutorial__wait">tap highlighted</span>
          ) : (
            <button type="button" className="battle-tutorial__next" onClick={onNext}>
              {isLastStep ? lastStepLabel : 'next ▸'}
            </button>
          )}
          <button type="button" className="battle-tutorial__skip" onClick={onSkip}>
            skip
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
