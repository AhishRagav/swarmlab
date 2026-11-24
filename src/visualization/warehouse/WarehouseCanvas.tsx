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
  onCanvasClick?: (worldCoord: { x: number; y: number }) => void
  className?: string
}

export function WarehouseCanvas({
  customers,
  solution,
  bounds,
  particles,
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

    // 3. Customer Assignment Connection Lines
    if (solution && solution.warehouses.length > 0) {
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

    // 5. Warehouse Nodes
    if (solution && solution.warehouses.length > 0) {
      drawWarehouses(ctx, solution.warehouses, bounds, dimensions, DEFAULT_CANVAS_PADDING)
    }

    ctx.restore()
  }, [customers, solution, bounds, particles, dimensions])

  // Mouse move handler for hover tooltips
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Check warehouses first
      if (solution?.warehouses) {
        for (const wh of solution.warehouses) {
          const pt = toCanvasCoords(wh, bounds, dimensions, DEFAULT_CANVAS_PADDING)
          if (Math.hypot(pt.x - mouseX, pt.y - mouseY) <= 16) {
            setHoverInfo({
              text: `Warehouse #${wh.index + 1}`,
              subtext: `Coords: (${wh.x.toFixed(1)}, ${wh.y.toFixed(1)}) | Served: ${wh.assignedCustomers} customers`,
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
    [customers, solution, bounds, dimensions]
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
            <div className="w-3.5 h-3.5 rounded-full bg-[#71717a] border border-white" />
            <span className="text-muted-foreground">Customer (equal demand = 1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-primary border border-white" />
            <span className="text-muted-foreground">Warehouse (W#)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-dashed border-[#a1a1aa]" />
            <span className="text-muted-foreground">Nearest Assignment</span>
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
