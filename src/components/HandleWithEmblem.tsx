import { useSyncExternalStore } from 'react'
import {
  getActiveEmblemId,
  getCosmeticsRevision,
  subscribeCosmeticsStore,
} from '../store/cosmeticsStore'
import { EmblemBadge } from './EmblemBadge'

type Props = {
  handle: string
  /** Prefix @ if not already present. */
  prefixAt?: boolean
  emblemSize?: number
  className?: string
}

export function HandleWithEmblem({
  handle,
  prefixAt = true,
  emblemSize = 14,
  className = '',
}: Props) {
  useSyncExternalStore(subscribeCosmeticsStore, getCosmeticsRevision, getCosmeticsRevision)
  const emblemId = getActiveEmblemId()
  const label = prefixAt && !handle.startsWith('@') ? `@${handle}` : handle

  return (
    <span className={`handle-with-emblem ${className}`.trim()}>
      <span className="handle-with-emblem__text">{label}</span>
      <EmblemBadge emblemId={emblemId} size={emblemSize} />
    </span>
  )
}
