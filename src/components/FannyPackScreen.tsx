import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  ARTIFACT_EMPTY_SLOT_SRC,
  FANNY_PACK_ARTIFACTS,
  getArtifactIconSrc,
  type CollectibleArtifactDef,
} from '../data/artifacts'
import {
  collectArtifact,
  getArtifactStoreSnapshot,
  getNewlyCollectedArtifact,
  resetArtifactsForDebug,
  subscribeArtifactStore,
} from '../store/artifactStore'
import { publicAsset } from '../utils/publicAsset'
import './FannyPackScreen.css'

const FADE_MS = 150
const FANNY_PACK_INTERIOR_SRC = publicAsset('Assets/ui/fanny-pack-interior.png')

type Props = {
  onClose: () => void
}

function useArtifactStore<T>(selector: (snap: ReturnType<typeof getArtifactStoreSnapshot>) => T): T {
  return useSyncExternalStore(
    subscribeArtifactStore,
    () => selector(getArtifactStoreSnapshot()),
    () => selector(getArtifactStoreSnapshot()),
  )
}

function ArtifactSlot({
  artifact,
  collected,
  revealing,
}: {
  artifact: CollectibleArtifactDef
  collected: boolean
  revealing: boolean
}) {
  const [iconFailed, setIconFailed] = useState(false)
  const [emptyFailed, setEmptyFailed] = useState(false)

  useEffect(() => {
    setIconFailed(false)
    setEmptyFailed(false)
  }, [artifact.id, collected])

  const showArtifactIcon = collected && !iconFailed
  const showEmptySlot = !collected && !emptyFailed

  return (
    <div
      className={`fanny-pack-screen__slot${collected ? ' fanny-pack-screen__slot--collected' : ''}${
        revealing ? ' fanny-pack-screen__slot--reveal' : ''
      }`}
      title={collected ? artifact.name : undefined}
      aria-label={collected ? artifact.name : 'Uncollected artifact slot'}
    >
      {showArtifactIcon ? (
        <img
          className="fanny-pack-screen__slot-icon fanny-pack-screen__slot-icon--artifact"
          src={getArtifactIconSrc(artifact.id)}
          alt=""
          draggable={false}
          onError={() => setIconFailed(true)}
        />
      ) : showEmptySlot ? (
        <img
          className="fanny-pack-screen__slot-icon"
          src={ARTIFACT_EMPTY_SLOT_SRC}
          alt=""
          draggable={false}
          onError={() => setEmptyFailed(true)}
        />
      ) : (
        <div className="fanny-pack-screen__slot-fallback" aria-hidden />
      )}
      <p
        className={`fanny-pack-screen__slot-label${
          collected ? '' : ' fanny-pack-screen__slot-label--hidden'
        }`}
        aria-hidden={!collected}
      >
        {collected ? artifact.name : '\u00a0'}
      </p>
    </div>
  )
}

function FannyPackBackground() {
  const [bgVisible, setBgVisible] = useState(true)

  return (
    <div className="fanny-pack-screen__bg" aria-hidden>
      <div className="fanny-pack-screen__bg-fallback" />
      {bgVisible ? (
        <img
          className="fanny-pack-screen__bg-img"
          src={FANNY_PACK_INTERIOR_SRC}
          alt=""
          draggable={false}
          onError={() => setBgVisible(false)}
        />
      ) : null}
    </div>
  )
}

export function FannyPackScreen({ onClose }: Props) {
  const [closing, setClosing] = useState(false)
  const collected = useArtifactStore((s) => s.collected)
  const newlyCollected = useArtifactStore(() => getNewlyCollectedArtifact())

  const collectedCount = useMemo(
    () => FANNY_PACK_ARTIFACTS.filter((a) => collected[a.id]).length,
    [collected],
  )

  const requestClose = useCallback(() => {
    setClosing(true)
  }, [])

  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => onClose(), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [closing, onClose])

  const handleDebugCollectNext = useCallback(() => {
    const next = FANNY_PACK_ARTIFACTS.find((a) => !collected[a.id])
    if (next) collectArtifact(next.id)
  }, [collected])

  const handleDebugReset = useCallback(() => {
    resetArtifactsForDebug()
  }, [])

  return (
    <div
      className={`fanny-pack-screen${closing ? ' fanny-pack-screen--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Fanny Pack artifacts"
      style={{ ['--fanny-pack-fade-ms' as string]: `${FADE_MS}ms` }}
      onClick={(e) => e.stopPropagation()}
    >
      <FannyPackBackground />

      <div className="fanny-pack-screen__panel">
        <header className="fanny-pack-screen__header">
          <h1 className="fanny-pack-screen__title">fanny pack</h1>
          <button type="button" className="fanny-pack-screen__close" onClick={requestClose}>
            close
          </button>
        </header>

        <div className="fanny-pack-screen__stage">
          <div className="fanny-pack-screen__grid" aria-label="Artifact slots">
            {FANNY_PACK_ARTIFACTS.map((artifact) => (
              <ArtifactSlot
                key={artifact.id}
                artifact={artifact}
                collected={collected[artifact.id]}
                revealing={newlyCollected === artifact.id}
              />
            ))}
          </div>
        </div>

        <footer className="fanny-pack-screen__footer">
          <button
            type="button"
            className="fanny-pack-screen__debug-collect"
            onClick={handleDebugCollectNext}
            disabled={collectedCount >= FANNY_PACK_ARTIFACTS.length}
          >
            collect next (debug)
          </button>
          <button type="button" className="fanny-pack-screen__debug-reset" onClick={handleDebugReset}>
            reset artifacts (debug)
          </button>
          <p className="fanny-pack-screen__debug-hint">
            {collectedCount} / {FANNY_PACK_ARTIFACTS.length} collected
          </p>
        </footer>
      </div>
    </div>
  )
}
