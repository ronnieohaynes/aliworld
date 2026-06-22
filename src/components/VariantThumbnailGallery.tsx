import type { MidnightVariantId } from '../data/midnightVariants'
import type { SkinVariantOption } from '../data/skinGrants'
import { VariantThumbnail } from './VariantThumbnail'
import './VariantThumbnailGallery.css'

type Props = {
  variants: readonly SkinVariantOption[]
  selectedId?: MidnightVariantId | null
  onSelect?: (id: MidnightVariantId) => void
  /** When false, tiles are display-only (no click handler). */
  interactive?: boolean
  thumbnailSize?: number
  ariaLabel: string
  emptyMessage?: string
}

export function VariantThumbnailGallery({
  variants,
  selectedId = null,
  onSelect,
  interactive = true,
  thumbnailSize = 72,
  ariaLabel,
  emptyMessage = 'no skins available',
}: Props) {
  if (variants.length === 0) {
    return <p className="variant-thumb-gallery__empty">{emptyMessage}</p>
  }

  return (
    <div
      className={`variant-thumb-gallery${interactive ? '' : ' variant-thumb-gallery--readonly'}`}
      role={interactive ? 'listbox' : 'list'}
      aria-label={ariaLabel}
    >
      {variants.map((variant) => {
        const selected = selectedId === variant.id
        const Tag = interactive ? 'button' : 'div'
        return (
          <Tag
            key={variant.id}
            type={interactive ? 'button' : undefined}
            className={`variant-thumb-gallery__tile${
              selected ? ' variant-thumb-gallery__tile--selected' : ''
            }`}
            role={interactive ? 'option' : 'listitem'}
            aria-selected={interactive ? selected : undefined}
            onClick={interactive && onSelect ? () => onSelect(variant.id) : undefined}
          >
            <VariantThumbnail
              variantId={variant.id}
              size={thumbnailSize}
              className="variant-thumb-gallery__thumb"
              label={variant.displayName}
            />
            <span className="variant-thumb-gallery__label">{variant.displayName}</span>
          </Tag>
        )
      })}
    </div>
  )
}
