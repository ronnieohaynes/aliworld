import type { CSSProperties } from 'react'

type Props = {
  grid: readonly string[]
  colors: Record<string, string>
  /** Mirror horizontally so fighters face each other */
  flip?: boolean
  label?: string
  className?: string
  /** CSS pixel size of each cell (default 5) */
  cellSize?: number
}

const DEFAULT_CELL = 5

export function PixelCharacter({ grid, colors, flip, label, className, cellSize = DEFAULT_CELL }: Props) {
  const rows = grid.length
  const cols = Math.max(...grid.map((r) => r.length))
  const cell = cellSize

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
    gridTemplateRows: `repeat(${rows}, ${cell}px)`,
    transform: flip ? 'scaleX(-1)' : undefined,
    imageRendering: 'pixelated',
  }

  return (
    <div className={`pixel-char-wrap ${className ?? ''}`}>
      <div className="pixel-char" style={style} aria-hidden>
        {grid.flatMap((row, y) =>
          [...row].map((ch, x) => (
            <span
              key={`${x}-${y}`}
              style={{
                width: cell,
                height: cell,
                backgroundColor: colors[ch] ?? '#000',
              }}
            />
          )),
        )}
      </div>
      {label ? <p className="pixel-char-label">{label}</p> : null}
    </div>
  )
}
