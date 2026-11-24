import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { EnvironmentConfig, Obstacle, Point2D } from '@/problems/robot-path'
import {
  DEFAULT_CANVAS_PADDING,
  drawCandidatePaths,
  drawCurrentPath,
  drawEndpoints,
  drawGlobalBestPath,
  drawGridAndAxes,
  drawObstacles,
  drawPathLegend,
  drawPbestPath,
  drawRobot,
  toCanvasCoords,
  toWorldCoords,
} from './canvasUtils'

export type CanvasInteractionMode =
  | 'select'
  | 'add-obstacle'
  | 'set-start'
  | 'set-goal'
  | 'delete-obstacle'

export interface RobotPathCanvasProps {
  environment: EnvironmentConfig
  selectedObstacleId: string | null
  interactionMode: CanvasInteractionMode
  candidatePaths?: Point2D[][]
  currentPath?: Point2D[]
  pbestPath?: Point2D[]
  globalBestPath?: Point2D[]
  showCurrent?: boolean
  showPbest?: boolean
  showGbest?: boolean
  robotPosition?: Point2D | null
  robotHeading?: number
  isSimulating?: boolean
  onSelectObstacle?: (id: string | null) => void
  onUpdateObstacle?: (obstacle: Obstacle) => void
  onAddObstacle?: (obstacle: Omit<Obstacle, 'id'>) => void
  onDeleteObstacle?: (id: string) => void
  onSetStart?: (point: Point2D) => void
  onSetGoal?: (point: Point2D) => void
  className?: string
}

export const RobotPathCanvas: React.FC<RobotPathCanvasProps> = ({
  environment,
  selectedObstacleId,
  interactionMode,
  candidatePaths = [],
  currentPath = [],
  pbestPath = [],
  globalBestPath = [],
  showCurrent = true,
  showPbest = true,
  showGbest = true,
  robotPosition = null,
  robotHeading = 0,
  isSimulating = false,
  onSelectObstacle,
  onUpdateObstacle,
  onAddObstacle,
  onDeleteObstacle,
  onSetStart,
  onSetGoal,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 650,
    height: 480,
  })

  // Interaction dragging states
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'move' | 'resize' | 'create' | null>(null)
  const [dragStartWorld, setDragStartWorld] = useState<Point2D | null>(null)
  const [initialObsState, setInitialObsState] = useState<Obstacle | null>(null)
  const [previewBox, setPreviewBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  // Handle container resizing
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        if (width > 0) {
          const height = Math.max(380, Math.min(560, Math.round(width * 0.72)))
          setDimensions({ width, height })
        }
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Master Render Pass
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = dimensions.width * dpr
    canvas.height = dimensions.height * dpr
    canvas.style.width = `${dimensions.width}px`
    canvas.style.height = `${dimensions.height}px`

    ctx.save()
    ctx.scale(dpr, dpr)

    // 1. Grid and Axes
    drawGridAndAxes(ctx, environment.mapWidth, environment.mapHeight, dimensions, DEFAULT_CANVAS_PADDING)

    // 2. Obstacles
    drawObstacles(
      ctx,
      environment.obstacles,
      selectedObstacleId,
      environment.mapWidth,
      environment.mapHeight,
      dimensions,
      DEFAULT_CANVAS_PADDING
    )

    // 3. Live creation preview box
    if (previewBox) {
      const tl = toCanvasCoords(
        { x: previewBox.x, y: previewBox.y + previewBox.height },
        environment.mapWidth,
        environment.mapHeight,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )
      const br = toCanvasCoords(
        { x: previewBox.x + previewBox.width, y: previewBox.y },
        environment.mapWidth,
        environment.mapHeight,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )
      ctx.fillStyle = 'rgba(245, 158, 11, 0.3)'
      ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y)
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 2])
      ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y)
      ctx.setLineDash([])
    }

    // 4. Subtle Candidate Paths (background swarm)
    drawCandidatePaths(
      ctx,
      candidatePaths,
      environment.mapWidth,
      environment.mapHeight,
      dimensions,
      DEFAULT_CANVAS_PADDING
    )

    // 5. Selected Particle Current Position Path (Grey)
    if (showCurrent && currentPath && currentPath.length >= 2) {
      drawCurrentPath(
        ctx,
        currentPath,
        environment.mapWidth,
        environment.mapHeight,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )
    }

    // 6. Selected Particle Personal Best (Pbest) Path (Blue)
    if (showPbest && pbestPath && pbestPath.length >= 2) {
      drawPbestPath(
        ctx,
        pbestPath,
        environment.mapWidth,
        environment.mapHeight,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )
    }

    // 7. Swarm Global Best (Gbest) Path (Amber)
    if (showGbest && globalBestPath && globalBestPath.length >= 2) {
      drawGlobalBestPath(
        ctx,
        globalBestPath,
        environment.mapWidth,
        environment.mapHeight,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )
    }

    // 8. Start & Goal Endpoints
    drawEndpoints(
      ctx,
      environment.start,
      environment.goal,
      environment.mapWidth,
      environment.mapHeight,
      dimensions,
      DEFAULT_CANVAS_PADDING
    )

    // 9. Animated Robot Marker
    if (robotPosition) {
      drawRobot(
        ctx,
        robotPosition,
        robotHeading,
        environment.mapWidth,
        environment.mapHeight,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )
    }

    // 10. On-Canvas Legend Box
    drawPathLegend(ctx, dimensions, DEFAULT_CANVAS_PADDING, showCurrent, showPbest, showGbest)

    ctx.restore()
  }, [
    dimensions,
    environment,
    selectedObstacleId,
    previewBox,
    candidatePaths,
    currentPath,
    pbestPath,
    globalBestPath,
    showCurrent,
    showPbest,
    showGbest,
    robotPosition,
    robotHeading,
  ])

  // Hit-testing helpers
  const findObstacleAt = useCallback(
    (worldPt: Point2D): Obstacle | null => {
      // Search in reverse so top-drawn obstacles are selected first
      for (let i = environment.obstacles.length - 1; i >= 0; i--) {
        const obs = environment.obstacles[i]
        if (
          worldPt.x >= obs.x &&
          worldPt.x <= obs.x + obs.width &&
          worldPt.y >= obs.y &&
          worldPt.y <= obs.y + obs.height
        ) {
          return obs
        }
      }
      return null
    },
    [environment.obstacles]
  )

  const isNearResizeHandle = useCallback(
    (obs: Obstacle, worldPt: Point2D): boolean => {
      const handleX = obs.x + obs.width
      const handleY = obs.y
      const dist = Math.hypot(worldPt.x - handleX, worldPt.y - handleY)
      // Generous handle tolerance in world units
      const tolerance = (environment.mapWidth / dimensions.width) * 12
      return dist <= tolerance
    },
    [dimensions.width, environment.mapWidth]
  )

  // Mouse Down Event
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isSimulating) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const pixelX = e.clientX - rect.left
      const pixelY = e.clientY - rect.top
      const world = toWorldCoords(
        { x: pixelX, y: pixelY },
        environment.mapWidth,
        environment.mapHeight,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )

      if (interactionMode === 'set-start') {
        onSetStart?.(world)
        return
      }

      if (interactionMode === 'set-goal') {
        onSetGoal?.(world)
        return
      }

      const hit = findObstacleAt(world)

      if (interactionMode === 'delete-obstacle') {
        if (hit) {
          onDeleteObstacle?.(hit.id)
        }
        return
      }

      if (interactionMode === 'add-obstacle') {
        setIsDragging(true)
        setDragMode('create')
        setDragStartWorld(world)
        setPreviewBox({ x: world.x, y: world.y, width: 0, height: 0 })
        return
      }

      if (interactionMode === 'select') {
        if (hit) {
          onSelectObstacle?.(hit.id)
          setInitialObsState({ ...hit })
          setDragStartWorld(world)
          setIsDragging(true)

          if (isNearResizeHandle(hit, world)) {
            setDragMode('resize')
          } else {
            setDragMode('move')
          }
        } else {
          onSelectObstacle?.(null)
        }
      }
    },
    [
      isSimulating,
      dimensions,
      environment.mapWidth,
      environment.mapHeight,
      interactionMode,
      findObstacleAt,
      isNearResizeHandle,
      onSetStart,
      onSetGoal,
      onDeleteObstacle,
      onSelectObstacle,
    ]
  )

  // Mouse Move Event
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !dragStartWorld) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const pixelX = e.clientX - rect.left
      const pixelY = e.clientY - rect.top
      const world = toWorldCoords(
        { x: pixelX, y: pixelY },
        environment.mapWidth,
        environment.mapHeight,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )

      if (dragMode === 'create') {
        const x = Math.min(dragStartWorld.x, world.x)
        const y = Math.min(dragStartWorld.y, world.y)
        const width = Math.abs(world.x - dragStartWorld.x)
        const height = Math.abs(world.y - dragStartWorld.y)
        setPreviewBox({ x, y, width, height })
        return
      }

      if (!initialObsState) return

      if (dragMode === 'move') {
        const deltaX = world.x - dragStartWorld.x
        const deltaY = world.y - dragStartWorld.y
        const newX = Math.max(0, Math.min(environment.mapWidth - initialObsState.width, initialObsState.x + deltaX))
        const newY = Math.max(0, Math.min(environment.mapHeight - initialObsState.height, initialObsState.y + deltaY))

        onUpdateObstacle?.({
          ...initialObsState,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
        })
      } else if (dragMode === 'resize') {
        // Dragging bottom-right handle (x increases right, y decreases down in world coords)
        const newWidth = Math.max(4, Math.min(environment.mapWidth - initialObsState.x, world.x - initialObsState.x))
        const newHeight = Math.max(4, Math.min(environment.mapHeight - initialObsState.y, initialObsState.y + initialObsState.height - world.y))
        const newY = Math.max(0, world.y)

        onUpdateObstacle?.({
          ...initialObsState,
          y: Math.round(newY * 10) / 10,
          width: Math.round(newWidth * 10) / 10,
          height: Math.round(newHeight * 10) / 10,
        })
      }
    },
    [
      isDragging,
      dragStartWorld,
      dimensions,
      environment.mapWidth,
      environment.mapHeight,
      dragMode,
      initialObsState,
      onUpdateObstacle,
    ]
  )

  // Mouse Up Event
  const handleMouseUp = useCallback(() => {
    if (dragMode === 'create' && previewBox) {
      if (previewBox.width >= 3 && previewBox.height >= 3) {
        onAddObstacle?.({
          x: Math.round(previewBox.x * 10) / 10,
          y: Math.round(previewBox.y * 10) / 10,
          width: Math.round(previewBox.width * 10) / 10,
          height: Math.round(previewBox.height * 10) / 10,
        })
      }
    }

    setIsDragging(false)
    setDragMode(null)
    setDragStartWorld(null)
    setInitialObsState(null)
    setPreviewBox(null)
  }, [dragMode, previewBox, onAddObstacle])

  const getCursorClass = () => {
    if (isSimulating) return 'cursor-not-allowed'
    switch (interactionMode) {
      case 'add-obstacle':
        return 'cursor-crosshair'
      case 'set-start':
      case 'set-goal':
        return 'cursor-cell'
      case 'delete-obstacle':
        return 'cursor-not-allowed'
      default:
        return 'cursor-default'
    }
  }

  return (
    <div className={`space-y-3 ${className ?? ''}`} ref={containerRef}>
      <div className="relative border border-border rounded-lg overflow-hidden shadow-inner bg-[#111315] flex justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`block ${getCursorClass()}`}
        />

        {/* HUD Overlay Stats in Top Corner */}
        {globalBestPath.length >= 2 && (
          <div className="absolute top-3 right-3 bg-[#242a30]/90 border border-border text-[11px] font-mono px-3 py-2 rounded backdrop-blur-sm text-foreground space-y-1 pointer-events-none shadow-md">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Path Status:</span>
              <span className="font-bold text-emerald-400">FEASIBLE</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Waypoints:</span>
              <span className="text-foreground">{globalBestPath.length - 2} intermediate</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-secondary/40 border border-border rounded-md text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
            Legend:
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-dashed border-[#a1a1aa]" />
            <span className="text-muted-foreground">Current Pos (Grey)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[#3b82f6]" />
            <span className="text-muted-foreground">Pbest (Blue)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1 bg-[#f59e0b]" />
            <span className="text-muted-foreground">Gbest (Amber)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#2d343c] border border-[#525b66]" />
            <span className="text-muted-foreground">Obstacle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#22c55e] border border-white" />
            <span className="text-muted-foreground">Start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ef4444] border border-white" />
            <span className="text-muted-foreground">Goal</span>
          </div>
        </div>
      </div>
    </div>
  )
}
