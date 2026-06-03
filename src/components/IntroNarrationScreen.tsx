import { useCallback, useEffect, useState } from 'react'
import './IntroNarrationScreen.css'

const INTRO_LINES = [
  "yo. i don't know who you are, but this whole town is in a frenzy.",
  'ask around to see what\'s going on.',
] as const

const CHAR_MS = 32

type Props = {
  onComplete: () => void
}

export function IntroNarrationScreen({ onComplete }: Props) {
  const [lineIndex, setLineIndex] = useState(0)
  const [visibleChars, setVisibleChars] = useState(0)
  const [lineComplete, setLineComplete] = useState(false)
  const [fading, setFading] = useState(false)

  const line = INTRO_LINES[lineIndex] ?? ''

  useEffect(() => {
    setVisibleChars(0)
    setLineComplete(false)
  }, [lineIndex])

  useEffect(() => {
    if (lineComplete || fading) return

    const id = window.setInterval(() => {
      setVisibleChars((count) => {
        if (count >= line.length) return count
        const next = count + 1
        if (next >= line.length) {
          setLineComplete(true)
        }
        return next
      })
    }, CHAR_MS)

    return () => window.clearInterval(id)
  }, [lineIndex, line.length, lineComplete, fading])

  const advance = useCallback(() => {
    if (fading) return
    if (!lineComplete) {
      setVisibleChars(line.length)
      setLineComplete(true)
      return
    }
    if (lineIndex < INTRO_LINES.length - 1) {
      setLineIndex((index) => index + 1)
      return
    }
    setFading(true)
    window.setTimeout(onComplete, 720)
  }, [fading, line.length, lineComplete, lineIndex, onComplete])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      e.preventDefault()
      advance()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [advance])

  const shown = line.slice(0, visibleChars)

  return (
    <div
      className={`intro-narration${fading ? ' intro-narration--fade-out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Intro narration"
      onClick={advance}
    >
      <div className="intro-narration__glow" aria-hidden />
      <p className="intro-narration__eyebrow">psst</p>
      <p className="intro-narration__text">
        {shown}
        {!lineComplete ? <span className="intro-narration__cursor" aria-hidden>|</span> : null}
      </p>
      {lineComplete ? (
        <span className="intro-narration__continue">tap to continue ▸</span>
      ) : null}
    </div>
  )
}
