import type { CrossScaleSkill } from '../data/moveBalance'

type ScalePart = { skill: CrossScaleSkill | 'native'; label: string }

const STAT_CLASS: Record<CrossScaleSkill | 'native', string> = {
  attack: 'move-scale-tag--atk',
  speed: 'move-scale-tag--spd',
  defense: 'move-scale-tag--def',
  luck: 'move-scale-tag--lck',
  native: 'move-scale-tag--native',
}

type Props = {
  parts: ScalePart[] | null | undefined
  className?: string
}

export function MoveScaleTag({ parts, className = '' }: Props) {
  if (!parts || parts.length === 0) return null
  return (
    <span className={`move-scale-tag ${className}`.trim()} aria-label="Stat scaling">
      <span className="move-scale-tag__prefix">scales:</span>
      {parts.map((part, i) => (
        <span key={`${part.label}-${i}`}>
          {i > 0 ? <span className="move-scale-tag__sep"> · </span> : ' '}
          <span className={STAT_CLASS[part.skill]}>{part.label}</span>
        </span>
      ))}
    </span>
  )
}
