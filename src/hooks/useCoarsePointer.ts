import { useSyncExternalStore } from 'react'

function getCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}

function subscribeCoarsePointer(onStoreChange: () => void): () => void {
  const mq = window.matchMedia('(pointer: coarse)')
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

/** True on touch-first devices (phones, tablets). */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribeCoarsePointer, getCoarsePointer, () => false)
}
