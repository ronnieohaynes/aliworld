import type { MidnightVariantId } from '../data/midnightVariants'
import { VariantThumbnail } from './VariantThumbnail'

type Props = {
  variantId: MidnightVariantId | string
  width: number
  height: number
  className?: string
}

export function LeaderboardVariantSprite({ variantId, width, height, className }: Props) {
  const size = Math.max(width, height)
  return (
    <VariantThumbnail
      variantId={variantId}
      size={size}
      className={className}
    />
  )
}
