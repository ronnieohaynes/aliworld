import { useMemo } from 'react'
import { listGrantableSkinVariants } from '../src/data/skinGrants'
import type { MidnightVariantId } from '../src/data/midnightVariants'
import { VariantThumbnailGallery } from '../src/components/VariantThumbnailGallery'

type Props = {
  selectedId: MidnightVariantId | null
  onSelect: (id: MidnightVariantId) => void
  ariaLabel?: string
}

/** Registry-driven skin picker for mothership grant composers. */
export function AdminSkinGrantPicker({
  selectedId,
  onSelect,
  ariaLabel = 'Select skin to grant',
}: Props) {
  const variants = useMemo(() => listGrantableSkinVariants(), [])

  return (
    <div className="admin-skin-picker">
      <p className="admin-skin-picker__hint">pick a skin by sight — grants the registry variant id</p>
      <VariantThumbnailGallery
        variants={variants}
        selectedId={selectedId}
        onSelect={onSelect}
        ariaLabel={ariaLabel}
        thumbnailSize={80}
      />
    </div>
  )
}
