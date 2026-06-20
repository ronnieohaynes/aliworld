import { useEffect, useRef, useState, type ReactNode } from 'react'
import { GAME_SHELL_HEIGHT, GAME_SHELL_WIDTH } from '../constants/gameAssets'
import './ScaledDesignStage.css'

type Props = {
  children: ReactNode
  className?: string
}

/** Uniformly scales a fixed 390×844 design canvas to fit the viewport (letterboxed). */
export function ScaledDesignStage({ children, className }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const updateScale = () => {
      const w = stage.clientWidth
      const h = stage.clientHeight
      if (w <= 0 || h <= 0) return
      setScale(Math.min(w / GAME_SHELL_WIDTH, h / GAME_SHELL_HEIGHT))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={stageRef} className={`scaled-design-stage${className ? ` ${className}` : ''}`}>
      <div
        className="scaled-design-stage__canvas"
        style={{
          width: GAME_SHELL_WIDTH,
          height: GAME_SHELL_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
