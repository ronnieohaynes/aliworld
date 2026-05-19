import { createContext, useContext } from 'react'

export type GameCanvasContextValue = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  registerLoop: (id: symbol, fn: GameLoopFn) => void
  unregisterLoop: (id: symbol) => void
  setDebugHud: (text: string) => void
}

export type GameLoopFn = (dt: number) => void

export const GameCanvasContext = createContext<GameCanvasContextValue | null>(null)

export function useGameCanvas(): GameCanvasContextValue {
  const value = useContext(GameCanvasContext)
  if (!value) {
    throw new Error('useGameCanvas must be used within <GameCanvas>')
  }
  return value
}
