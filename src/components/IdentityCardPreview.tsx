import { useCallback, useEffect } from 'react'
import {
  downloadIdentityCardPng,
  shareIdentityCardPng,
} from '../lib/identityCardShare'
import './IdentityCardPreview.css'

type Props = {
  previewUrl: string
  blob: Blob
  onClose: () => void
}

export function IdentityCardPreview({ previewUrl, blob, onClose }: Props) {
  useEffect(() => {
    return () => {
      // parent revokes object URL on unmount
    }
  }, [])

  const handleShare = useCallback(async () => {
    try {
      await shareIdentityCardPng(blob)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('[identity card share]', err)
    }
  }, [blob])

  const handleSave = useCallback(() => {
    downloadIdentityCardPng(blob)
  }, [blob])

  return (
    <div className="identity-card-preview" role="dialog" aria-modal="true" aria-label="Share card">
      <button
        type="button"
        className="identity-card-preview__backdrop"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="identity-card-preview__panel">
        <header className="identity-card-preview__header">
          <h2 className="identity-card-preview__title">your card</h2>
          <button type="button" className="identity-card-preview__close" onClick={onClose}>
            close
          </button>
        </header>
        <div className="identity-card-preview__body">
          <div className="identity-card-preview__frame">
            <img
              className="identity-card-preview__img"
              src={previewUrl}
              alt="ALIWORLD identity card preview"
              draggable={false}
            />
          </div>
        </div>
        <div className="identity-card-preview__actions">
          <button type="button" className="identity-card-preview__share" onClick={handleShare}>
            share
          </button>
          <button type="button" className="identity-card-preview__save" onClick={handleSave}>
            save
          </button>
        </div>
      </div>
    </div>
  )
}
