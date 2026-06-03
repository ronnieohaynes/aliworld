import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { buildQuestObjectiveContext, resolvePrimaryQuestObjective } from '../data/questObjectives'
import { track } from '../lib/analytics'
import { getArtifactStoreSnapshot, subscribeArtifactStore } from '../store/artifactStore'
import { getQuest1Snapshot, subscribeQuest1Store } from '../store/quest1Store'
import { getQuest2Snapshot, subscribeQuest2Store } from '../store/quest2Store'
import { getWorldMemorySnapshot, subscribeWorldMemoryStore } from '../store/worldMemory'
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
  const worldRevision = useSyncExternalStore(
    subscribeWorldMemoryStore,
    getWorldMemorySnapshot,
    getWorldMemorySnapshot,
  )

  const quest2Revision = useSyncExternalStore(
    subscribeQuest2Store,
    getQuest2Snapshot,
    getQuest2Snapshot,
  )

  const objective = useMemo(() => {
    void artifactRevision
    void quest1Revision
    void quest2Revision
    void worldRevision
    return resolvePrimaryQuestObjective(buildQuestObjectiveContext())
  }, [artifactRevision, quest1Revision, quest2Revision, worldRevision])

  const prevObjectiveRef = useRef<{ questId: string; stepId: string } | null>(null)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const prev = prevObjectiveRef.current
    const next = { questId: objective.questId, stepId: objective.stepId }
    prevObjectiveRef.current = next

    if (
      prev &&
      (prev.questId !== next.questId || prev.stepId !== next.stepId)
    ) {
      track('quest_step_advance', {
        questId: next.questId,
        stepId: next.stepId,
      })
      setFlash(true)
      const timer = window.setTimeout(() => setFlash(false), 600)
      return () => window.clearTimeout(timer)
    }
  }, [objective.questId, objective.stepId])

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
