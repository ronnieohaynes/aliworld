import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { DEFAULT_ACCESSORY_SELECTIONS, DEFAULT_FACE_SELECTIONS } from '../avatar/avatarData'
import type { AccessoryId, FaceCategoryId } from '../avatar/types'

export type FaceSelections = Record<FaceCategoryId, string>
export type AccessorySelections = Record<AccessoryId, string>

type AvatarLoadoutValue = {
  face: FaceSelections
  acc: AccessorySelections
  setFace: Dispatch<SetStateAction<FaceSelections>>
  setAcc: Dispatch<SetStateAction<AccessorySelections>>
}

const AvatarLoadoutContext = createContext<AvatarLoadoutValue | null>(null)

export function AvatarLoadoutProvider({ children }: { children: ReactNode }) {
  const [face, setFace] = useState<FaceSelections>(DEFAULT_FACE_SELECTIONS)
  const [acc, setAcc] = useState<AccessorySelections>(DEFAULT_ACCESSORY_SELECTIONS)
  const value = useMemo(() => ({ face, acc, setFace, setAcc }), [face, acc])
  return <AvatarLoadoutContext.Provider value={value}>{children}</AvatarLoadoutContext.Provider>
}

export function useAvatarLoadout(): AvatarLoadoutValue {
  const ctx = useContext(AvatarLoadoutContext)
  if (!ctx) {
    throw new Error('useAvatarLoadout must be used within AvatarLoadoutProvider')
  }
  return ctx
}
