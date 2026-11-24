import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import type { Customer, WarehouseBounds, WarehouseSolutionAnalysis } from '@/problems/warehouse/types'
import type { Particle } from '@/algorithms/pso/types'
import {
  DEFAULT_CANVAS_PADDING,
  drawGridAndAxes,
  drawCustomerAssignments,
  drawCustomers,
  drawWarehouses,
  toCanvasCoords,
  toWorldCoords,
  getWarehouseColor,
  getCustomerRadius,
} from './canvasUtils'

export interface WarehouseCanvasProps {
  customers: Customer[]
  solution: WarehouseSolutionAnalysis | null
  bounds: WarehouseBounds
  particles?: Particle[]
  selectedParticleIndex?: number
  showCurrent?: boolean
  showPbest?: boolean
  showGbest?: boolean
  onCanvasClick?: (worldCoord: { x: number; y: number }) => void
  className?: string
}

export function WarehouseCanvas({
  customers,
  solution,
  bounds,
  particles,
  selectedParticleIndex = 0,
  showCurrent = true,
  showPbest = true,
  showGbest = true,
  onCanvasClick,
  className,
}: WarehouseCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 420,
  })

  // Tooltip hover state
  const [hoverInfo, setHoverInfo] = useState<{
    text: string
    subtext?: string
    x: number
    y: number
  } | null>(null)

  // Track container size with ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const width = container.clientWidth
      // Maintain roughly 4:3 or 16:10 aspect ratio with minimum 380px height
      const height = Math.max(380, Math.min(560, Math.round(width * 0.65)))
      setDimensions({ width, height })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const { width, height } = dimensions

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    ctx.save()
    ctx.scale(dpr, dpr)

    // 1. Background, Grid and Axes
    drawGridAndAxes(ctx, bounds, dimensions, DEFAULT_CANVAS_PADDING)

    // 2. Faint Particle Swarm Candidates (candidate warehouse locations)
    if (particles && particles.length > 0) {
      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
      for (const p of particles) {
        const k = Math.floor(p.position.length / 2)
        for (let i = 0; i < k; i++) {
          const pt = toCanvasCoords(
            { x: p.position[2 * i], y: p.position[2 * i + 1] },
            bounds,
            dimensions,
            DEFAULT_CANVAS_PADDING
          )
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    }

    // 3. Customer Assignment Connection Lines (to Gbest)
    if (showGbest && solution && solution.warehouses.length > 0) {
      drawCustomerAssignments(
        ctx,
        solution.assignments,
        solution.warehouses,
        bounds,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )
    }

    // 4. Customer Nodes
    drawCustomers(
      ctx,
      customers,
      solution ? solution.assignments : [],
      bounds,
      dimensions,
      DEFAULT_CANVAS_PADDING
    )

    const selectedParticle =
      particles && selectedParticleIndex >= 0 && selectedParticleIndex < particles.length
        ? particles[selectedParticleIndex]
        : null

    // 5. Current Position Warehouses (Grey)
    if (showCurrent && selectedParticle && selectedParticle.position) {
      drawParticleWarehouses(
        ctx,
        selectedParticle.position,
        'current',
        bounds,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )
    }

    // 6. Personal Best (Pbest) Warehouses (Blue)
    if (showPbest && selectedParticle && selectedParticle.pbestPosition) {
      drawParticleWarehouses(
        ctx,
        selectedParticle.pbestPosition,
        'pbest',
        bounds,
        dimensions,
        DEFAULT_CANVAS_PADDING
      )
    }

    // 7. Global Best (Gbest) Warehouses (Amber)
    if (showGbest && solution && solution.warehouses.length > 0) {
      drawWarehouses(ctx, solution.warehouses, bounds, dimensions, DEFAULT_CANVAS_PADDING)
    }

    // 8. Visual Legend
    drawCanvasLegend(ctx, dimensions, DEFAULT_CANVAS_PADDING, showCurrent, showPbest, showGbest)

    ctx.restore()
  }, [
    customers,
    solution,
    bounds,
    particles,
    dimensions,
    selectedParticleIndex,
    showCurrent,
    showPbest,
    showGbest,
  ])

  // Mouse move handler for hover tooltips
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const selectedParticle =
        particles && selectedParticleIndex >= 0 && selectedParticleIndex < particles.length
          ? particles[selectedParticleIndex]
          : null

      // 1. Check Gbest Warehouses
      if (showGbest && solution?.warehouses) {
        for (const wh of solution.warehouses) {
          const pt = toCanvasCoords(wh, bounds, dimensions, DEFAULT_CANVAS_PADDING)
          if (Math.hypot(pt.x - mouseX, pt.y - mouseY) <= 16) {
            setHoverInfo({
              text: `Gbest Warehouse #${wh.index + 1}`,
              subtext: `Coords: (${wh.x.toFixed(1)}, ${wh.y.toFixed(1)}) | Served: ${wh.assignedCustomers} customers`,
              x: mouseX,
              y: mouseY,
            })
            return
          }
        }
      }

      // 2. Check Pbest Warehouses
      if (showPbest && selectedParticle?.pbestPosition) {
        const k = Math.floor(selectedParticle.pbestPosition.length / 2)
        for (let i = 0; i < k; i++) {
          const wh = {
            x: selectedParticle.pbestPosition[2 * i],
            y: selectedParticle.pbestPosition[2 * i + 1],
          }
          const pt = toCanvasCoords(wh, bounds, dimensions, DEFAULT_CANVAS_PADDING)
          if (Math.hypot(pt.x - mouseX, pt.y - mouseY) <= 14) {
            setHoverInfo({
              text: `Pbest Warehouse #${i + 1} (Particle ${selectedParticleIndex + 1})`,
              subtext: `Coords: (${wh.x.toFixed(1)}, ${wh.y.toFixed(1)}) | Pbest Fitness: ${
                selectedParticle.pbestFitness < Infinity
                  ? selectedParticle.pbestFitness.toFixed(2)
                  : '—'
              }`,
              x: mouseX,
              y: mouseY,
            })
            return
          }
        }
      }

      // 3. Check Current Position Warehouses
      if (showCurrent && selectedParticle?.position) {
        const k = Math.floor(selectedParticle.position.length / 2)
        for (let i = 0; i < k; i++) {
          const wh = {
            x: selectedParticle.position[2 * i],
            y: selectedParticle.position[2 * i + 1],
          }
          const pt = toCanvasCoords(wh, bounds, dimensions, DEFAULT_CANVAS_PADDING)
          if (Math.hypot(pt.x - mouseX, pt.y - mouseY) <= 14) {
            setHoverInfo({
              text: `Current Warehouse #${i + 1} (Particle ${selectedParticleIndex + 1})`,
              subtext: `Coords: (${wh.x.toFixed(1)}, ${wh.y.toFixed(1)}) | Current Fitness: ${
                selectedParticle.currentFitness !== undefined
                  ? selectedParticle.currentFitness.toFixed(2)
                  : '—'
              }`,
              x: mouseX,
              y: mouseY,
            })
            return
          }
        }
      }

      // Check customers
      for (const c of customers) {
        const pt = toCanvasCoords(c, bounds, dimensions, DEFAULT_CANVAS_PADDING)
        const radius = getCustomerRadius(c.demand)
        if (Math.hypot(pt.x - mouseX, pt.y - mouseY) <= radius + 3) {
          const asgn = solution?.assignments.find((a) => a.customerId === c.id)
          setHoverInfo({
            text: `Customer ${c.id}`,
            subtext: `Coords: (${c.x.toFixed(1)}, ${c.y.toFixed(1)})${
              asgn
                ? ` → Warehouse #${asgn.nearestWarehouseIndex + 1} (dist: ${asgn.distance.toFixed(1)})`
                : ''
            }`,
            x: mouseX,
            y: mouseY,
          })
          return
        }
      }

      setHoverInfo(null)
    },
    [customers, solution, bounds, dimensions, particles, selectedParticleIndex, showCurrent, showGbest, showPbest]
  )

  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onCanvasClick) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const world = toWorldCoords({ x: mouseX, y: mouseY }, bounds, dimensions, DEFAULT_CANVAS_PADDING)
      onCanvasClick(world)
    },
    [onCanvasClick, bounds, dimensions]
  )

  // Warehouse Legend Items
  const legendItems = useMemo(() => {
    const k = solution?.warehouses.length || 0
    return Array.from({ length: k }, (_, i) => ({
      index: i,
      name: `Warehouse #${i + 1}`,
      color: getWarehouseColor(i),
    }))
  }, [solution?.warehouses.length])

  return (
    <div className={`space-y-3 ${className ?? ''}`} ref={containerRef}>
      {/* Canvas Viewport Container */}
      <div className="relative border border-border rounded-lg overflow-hidden shadow-inner bg-[#111315] flex justify-center">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className={`block ${onCanvasClick ? 'cursor-crosshair' : 'cursor-default'}`}
        />

        {/* Hover Tooltip Overlay */}
        {hoverInfo && (
          <div
            className="absolute pointer-events-none bg-[#242a30]/95 border border-border text-foreground px-2.5 py-1.5 rounded-md text-xs shadow-xl backdrop-blur-sm z-20 transform -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: `${Math.max(100, Math.min(dimensions.width - 100, hoverInfo.x))}px`,
              top: `${Math.max(45, hoverInfo.y - 12)}px`,
            }}
          >
            <div className="font-semibold text-primary">{hoverInfo.text}</div>
            {hoverInfo.subtext && (
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5 whitespace-nowrap">
                {hoverInfo.subtext}
              </div>
            )}
          </div>
        )}

        {/* HUD Stats in Top Corner */}
        {solution && (
          <div className="absolute top-3 right-3 bg-[#242a30]/90 border border-border text-[11px] font-mono px-2.5 py-1.5 rounded backdrop-blur-sm text-foreground space-y-0.5 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Transport Distance:</span>
              <span className="font-bold text-primary text-xs">
                {solution.objectiveValue.toFixed(2)}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {solution.warehouses.length} Wh / {customers.length} Customers
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
            <div className="w-3.5 h-3.5 rounded-sm bg-[#52525b] border border-[#a1a1aa]" />
            <span className="text-muted-foreground">Current Pos (Grey C#)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-[#2563eb] border border-[#93c5fd]" />
            <span className="text-muted-foreground">Pbest (Blue P#)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-sm bg-[#f59e0b] border border-white" />
            <span className="text-muted-foreground">Gbest (Amber W#)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#64748b] border border-white" />
            <span className="text-muted-foreground">Customer Node</span>
          </div>
        </div>

        {/* Per-Warehouse Color Swatches */}
        {legendItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {legendItems.map((item) => (
              <div key={item.index} className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ backgroundColor: item.color.main }}
                />
                <span className="text-[11px] font-mono text-muted-foreground">W{item.index + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Draws warehouse nodes for a particle's Current Position (Grey) or Pbest (Blue).
 */
function drawParticleWarehouses(
  ctx: CanvasRenderingContext2D,
  coords: number[],
  type: 'current' | 'pbest',
  bounds: WarehouseBounds,
  canvasSize: { width: number; height: number },
  padding: { left: number; right: number; top: number; bottom: number }
) {
  const k = Math.floor(coords.length / 2)
  ctx.save()

  for (let i = 0; i < k; i++) {
    const pt = toCanvasCoords({ x: coords[2 * i], y: coords[2 * i + 1] }, bounds, canvasSize, padding)
    const size = 20
    const half = size / 2

    if (type === 'current') {
      // Grey style for Current Position
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, size * 0.75, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(113, 113, 122, 0.25)'
      ctx.fill()

      ctx.beginPath()
      ctx.rect(pt.x - half, pt.y - half, size, size)
      ctx.fillStyle = '#52525b'
      ctx.fill()
      ctx.strokeStyle = '#a1a1aa'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = '#f4f4f5'
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`C${i + 1}`, pt.x, pt.y)
    } else {
      // Blue style for Personal Best (Pbest)
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, size * 0.85, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
      ctx.fill()

      ctx.beginPath()
      ctx.rect(pt.x - half, pt.y - half, size, size)
      ctx.fillStyle = '#2563eb'
      ctx.fill()
      ctx.strokeStyle = '#93c5fd'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`P${i + 1}`, pt.x, pt.y)
    }
  }

  ctx.restore()
}

/**
 * Draws an on-canvas legend panel in the upper corner.
 */
function drawCanvasLegend(
  ctx: CanvasRenderingContext2D,
  _canvasSize: { width: number; height: number },
  padding: { left: number; right: number; top: number; bottom: number },
  showCurrent: boolean,
  showPbest: boolean,
  showGbest: boolean
) {
  ctx.save()
  const items = [
    { label: 'Current Pos', color: '#71717a', active: showCurrent, shape: 'square' as const },
    { label: 'Pbest', color: '#3b82f6', active: showPbest, shape: 'square' as const },
    { label: 'Gbest', color: '#f59e0b', active: showGbest, shape: 'square' as const },
    { label: 'Customer', color: '#64748b', active: true, shape: 'circle' as const },
  ]

  const x = padding.left + 8
  let y = padding.top + 8
  const itemH = 14

  // Subtle dark background panel
  ctx.fillStyle = 'rgba(25, 29, 33, 0.88)'
  ctx.strokeStyle = '#3f454d'
  ctx.lineWidth = 1
  ctx.fillRect(x - 4, y - 4, 105, items.length * itemH + 6)
  ctx.strokeRect(x - 4, y - 4, 105, items.length * itemH + 6)

  ctx.font = '9px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  for (const item of items) {
    if (item.shape === 'circle') {
      ctx.beginPath()
      ctx.arc(x + 4, y + itemH / 2, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = item.color
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 0.5
      ctx.stroke()
    } else {
      ctx.fillStyle = item.active ? item.color : '#3f454d'
      ctx.fillRect(x + 1, y + itemH / 2 - 3.5, 7, 7)
      ctx.strokeStyle = item.active ? '#f4f4f5' : '#71717a'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x + 1, y + itemH / 2 - 3.5, 7, 7)
    }

    ctx.fillStyle = item.active ? '#f5f5f4' : '#71717a'
    ctx.fillText(item.label, x + 14, y + itemH / 2)
    y += itemH
  }

  ctx.restore()
}
