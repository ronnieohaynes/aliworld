import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  buildQuestObjectiveContext,
  resolvePrimaryQuestObjective,
} from '../data/questObjectives'
import { getArtifactStoreSnapshot, subscribeArtifactStore } from '../store/artifactStore'
import { getQuest1Snapshot, subscribeQuest1Store } from '../store/quest1Store'
import './QuestHelper.css'

export function QuestHelper() {
  const artifactRevision = useSyncExternalStore(
    subscribeArtifactStore,
    getArtifactStoreSnapshot,
    getArtifactStoreSnapshot,
  )
  const quest1Revision = useSyncExternalStore(
    subscribeQuest1Store,
    getQuest1Snapshot,
    getQuest1Snapshot,
  )

  const objective = useMemo(() => {
    void artifactRevision
    void quest1Revision
    return resolvePrimaryQuestObjective(buildQuestObjectiveContext())
  }, [artifactRevision, quest1Revision])

  const prevStepIdRef = useRef(objective.stepId)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (prevStepIdRef.current === objective.stepId) return
    prevStepIdRef.current = objective.stepId
    setFlash(true)
    const timer = window.setTimeout(() => setFlash(false), 600)
    return () => window.clearTimeout(timer)
  }, [objective.stepId])

  if (!objective.text) return null

  return (
    <div
      className={`quest-helper${flash ? ' quest-helper--flash' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Objective: ${objective.text}`}
    >
      <span className="quest-helper__label">objective</span>
      <span className="quest-helper__text">{objective.text}</span>
    </div>
  )
}
