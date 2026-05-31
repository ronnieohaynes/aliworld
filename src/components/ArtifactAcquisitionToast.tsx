import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  ARTIFACT_EMPTY_SLOT_SRC,
  getArtifactDef,
  getArtifactIconSrc,
} from '../data/artifacts'
import {
  ARTIFACT_TOAST_VISIBLE_MS,
  dismissArtifactToast,
  getArtifactToastQueue,
  subscribeArtifactStore,
  type ArtifactToastItem,
} from '../store/artifactStore'
import './ArtifactAcquisitionToast.css'

function ArtifactToastCard({ item }: { item: ArtifactToastItem }) {
  const [iconFailed, setIconFailed] = useState(false)
  const artifact = getArtifactDef(item.artifactId)

  const handleDismiss = useCallback(() => {
    dismissArtifactToast(item.token)
  }, [item.token])

  useEffect(() => {
    const timer = window.setTimeout(handleDismiss, ARTIFACT_TOAST_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [handleDismiss])

  const title = `${artifact.name.toUpperCase()} acquired`

  return (
    <div
      className="artifact-toast"
      role="status"
      style={{ ['--artifact-toast-ms' as string]: `${ARTIFACT_TOAST_VISIBLE_MS}ms` }}
      onAnimationEnd={(e) => {
        if (e.animationName === 'artifact-toast-life') handleDismiss()
      }}
    >
      <div className="artifact-toast__icon-wrap" aria-hidden>
        {!iconFailed ? (
          <img
            className="artifact-toast__icon"
            src={getArtifactIconSrc(item.artifactId)}
            alt=""
            draggable={false}
            onError={() => setIconFailed(true)}
          />
        ) : (
          <img
            className="artifact-toast__icon"
            src={ARTIFACT_EMPTY_SLOT_SRC}
            alt=""
            draggable={false}
          />
        )}
      </div>
      <div className="artifact-toast__copy">
        <p className="artifact-toast__eyebrow">artifact acquired</p>
        <p className="artifact-toast__title">{title}</p>
      </div>
    </div>
  )
}

export function ArtifactAcquisitionToasts() {
  const toastQueue = useSyncExternalStore(
    subscribeArtifactStore,
    getArtifactToastQueue,
    getArtifactToastQueue,
  )

  if (toastQueue.length === 0) return null

  return (
    <div className="artifact-toast-root" aria-live="polite" aria-atomic="false">
      {toastQueue.map((item) => (
        <ArtifactToastCard key={item.token} item={item} />
      ))}
    </div>
  )
}
