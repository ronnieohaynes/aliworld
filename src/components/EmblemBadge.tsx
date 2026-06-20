import type { EmblemId } from '../data/emblemRegistry'
import { getEmblemDef } from '../data/emblemRegistry'
import './EmblemBadge.css'

type Props = {
  emblemId: EmblemId | null | undefined
  size?: number
  className?: string
}

export function EmblemBadge({ emblemId, size = 16, className = '' }: Props) {
  if (!emblemId) return null
  const def = getEmblemDef(emblemId)
  return (
    <img
      className={`emblem-badge ${className}`.trim()}
      src={def.artSrc}
      alt=""
      width={size}
      height={size}
      draggable={false}
    />
  )
}
