import type { ReactNode } from 'react'
import { buildMoveLogHighlightPatterns } from './moveHighlightColors'

type LogSegment = { text: string; color?: string }

const MOVE_HIGHLIGHT_PATTERNS = buildMoveLogHighlightPatterns()

function applyHighlightPattern(segments: LogSegment[], pattern: RegExp, color: string): LogSegment[] {
  const next: LogSegment[] = []

  for (const segment of segments) {
    if (segment.color) {
      next.push(segment)
      continue
    }

    const text = segment.text
    const re = new RegExp(pattern.source, pattern.flags)
    let lastIdx = 0
    let matched = false
    let match: RegExpExecArray | null

    while ((match = re.exec(text)) !== null) {
      matched = true
      if (match.index > lastIdx) {
        next.push({ text: text.slice(lastIdx, match.index) })
      }
      next.push({ text: match[0], color })
      lastIdx = match.index + match[0].length
    }

    if (!matched) {
      next.push(segment)
    } else if (lastIdx < text.length) {
      next.push({ text: text.slice(lastIdx) })
    }
  }

  return next
}

/** Wrap recognized move names in a battle log line with skill-colored spans. */
export function renderHighlightedLogLine(line: string): ReactNode {
  let segments: LogSegment[] = [{ text: line }]

  for (const { pattern, color } of MOVE_HIGHLIGHT_PATTERNS) {
    segments = applyHighlightPattern(segments, pattern, color)
  }

  return segments.map((segment, index) =>
    segment.color ? (
      <span
        key={index}
        className="battle-screen__telegraph-move"
        style={{ color: segment.color }}
      >
        {segment.text}
      </span>
    ) : (
      <span key={index}>{segment.text}</span>
    ),
  )
}
