import type { WarehouseBounds, Customer, CustomerAssignment, WarehouseLocation } from '@/problems/warehouse/types'

export interface CanvasPadding {
  left: number
  right: number
  top: number
  bottom: number
}

export const DEFAULT_CANVAS_PADDING: CanvasPadding = {
  left: 45,
  right: 25,
  top: 30,
  bottom: 40,
}

// Harmonious palette for warehouses and their customer assignment clusters
export const WAREHOUSE_COLORS = [
  { main: '#3b82f6', light: '#93c5fd', bg: 'rgba(59, 130, 246, 0.15)', line: 'rgba(59, 130, 246, 0.45)' }, // Blue
  { main: '#10b981', light: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.15)', line: 'rgba(16, 185, 129, 0.45)' }, // Emerald
  { main: '#f59e0b', light: '#fcd34d', bg: 'rgba(245, 158, 11, 0.15)', line: 'rgba(245, 158, 11, 0.45)' }, // Amber
  { main: '#8b5cf6', light: '#c4b5fd', bg: 'rgba(139, 92, 246, 0.15)', line: 'rgba(139, 92, 246, 0.45)' }, // Violet
  { main: '#ec4899', light: '#f9a8d4', bg: 'rgba(236, 72, 153, 0.15)', line: 'rgba(236, 72, 153, 0.45)' }, // Pink
  { main: '#0ea5e9', light: '#7dd3fc', bg: 'rgba(14, 165, 233, 0.15)', line: 'rgba(14, 165, 233, 0.45)' }, // Sky
  { main: '#f97316', light: '#fdba74', bg: 'rgba(249, 115, 22, 0.15)', line: 'rgba(249, 115, 22, 0.45)' }, // Orange
  { main: '#14b8a6', light: '#5eead4', bg: 'rgba(20, 184, 166, 0.15)', line: 'rgba(20, 184, 166, 0.45)' }, // Teal
  { main: '#a855f7', light: '#d8b4fe', bg: 'rgba(168, 85, 247, 0.15)', line: 'rgba(168, 85, 247, 0.45)' }, // Purple
  { main: '#84cc16', light: '#bef264', bg: 'rgba(132, 204, 22, 0.15)', line: 'rgba(132, 204, 22, 0.45)' }, // Lime
]

export function getWarehouseColor(index: number) {
  return WAREHOUSE_COLORS[index % WAREHOUSE_COLORS.length]
}

/**
 * Transforms world coordinates (X, Y) to canvas pixel coordinates.
 */
export function toCanvasCoords(
  point: { x: number; y: number },
  bounds: WarehouseBounds,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
): { x: number; y: number } {
  const plotWidth = Math.max(1, canvasSize.width - padding.left - padding.right)
  const plotHeight = Math.max(1, canvasSize.height - padding.top - padding.bottom)

  const spanX = Math.max(1e-5, bounds.maxX - bounds.minX)
  const spanY = Math.max(1e-5, bounds.maxY - bounds.minY)

  const normX = (point.x - bounds.minX) / spanX
  const normY = (point.y - bounds.minY) / spanY

  return {
    x: padding.left + normX * plotWidth,
    y: canvasSize.height - padding.bottom - normY * plotHeight,
  }
}

/**
 * Transforms canvas pixel coordinates to world coordinates (X, Y).
 */
export function toWorldCoords(
  pixel: { x: number; y: number },
  bounds: WarehouseBounds,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
): { x: number; y: number } {
  const plotWidth = Math.max(1, canvasSize.width - padding.left - padding.right)
  const plotHeight = Math.max(1, canvasSize.height - padding.top - padding.bottom)

  const spanX = Math.max(1e-5, bounds.maxX - bounds.minX)
  const spanY = Math.max(1e-5, bounds.maxY - bounds.minY)

  const normX = (pixel.x - padding.left) / plotWidth
  const normY = (canvasSize.height - padding.bottom - pixel.y) / plotHeight

  return {
    x: Math.round((bounds.minX + normX * spanX) * 100) / 100,
    y: Math.round((bounds.minY + normY * spanY) * 100) / 100,
  }
}

/**
 * Computes customer marker radius based on demand.
 */
export function getCustomerRadius(demand: number): number {
  return Math.max(5, Math.min(14, 5 + Math.sqrt(Math.max(1, demand)) * 2))
}

/**
 * Draws coordinate axes, labels, and background grid lines on canvas.
 */
export function drawGridAndAxes(
  ctx: CanvasRenderingContext2D,
  bounds: WarehouseBounds,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  const { width, height } = canvasSize
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  ctx.save()

  // Clean background
  ctx.fillStyle = '#111315'
  ctx.fillRect(0, 0, width, height)

  // Plot area background
  ctx.fillStyle = '#191d21'
  ctx.fillRect(padding.left, padding.top, plotWidth, plotHeight)

  // Grid lines
  const gridSteps = 5
  ctx.strokeStyle = '#2a3038'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.fillStyle = '#a1a1aa'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i <= gridSteps; i++) {
    const fraction = i / gridSteps

    // Vertical grid line & X axis labels
    const x = padding.left + fraction * plotWidth
    const worldX = bounds.minX + fraction * (bounds.maxX - bounds.minX)

    ctx.beginPath()
    ctx.moveTo(x, padding.top)
    ctx.lineTo(x, height - padding.bottom)
    ctx.stroke()

    ctx.fillText(worldX.toFixed(0), x, height - padding.bottom + 14)

    // Horizontal grid line & Y axis labels
    const y = height - padding.bottom - fraction * plotHeight
    const worldY = bounds.minY + fraction * (bounds.maxY - bounds.minY)

    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()

    ctx.save()
    ctx.textAlign = 'right'
    ctx.fillText(worldY.toFixed(0), padding.left - 8, y)
    ctx.restore()
  }

  // Plot border
  ctx.setLineDash([])
  ctx.strokeStyle = '#3f454d'
  ctx.lineWidth = 1.5
  ctx.strokeRect(padding.left, padding.top, plotWidth, plotHeight)

  // Axis Title Labels
  ctx.fillStyle = '#a1a1aa'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('X Coordinate', padding.left + plotWidth / 2, height - 10)

  ctx.save()
  ctx.translate(14, padding.top + plotHeight / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Y Coordinate', 0, 0)
  ctx.restore()

  ctx.restore()
}

/**
 * Draws lines connecting customers to their assigned nearest warehouse.
 */
export function drawCustomerAssignments(
  ctx: CanvasRenderingContext2D,
  assignments: CustomerAssignment[],
  warehouses: WarehouseLocation[],
  bounds: WarehouseBounds,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  ctx.save()

  for (const asgn of assignments) {
    const wh = warehouses[asgn.nearestWarehouseIndex]
    if (!wh) continue

    const cPos = toCanvasCoords({ x: asgn.customerX, y: asgn.customerY }, bounds, canvasSize, padding)
    const wPos = toCanvasCoords({ x: wh.x, y: wh.y }, bounds, canvasSize, padding)

    const color = getWarehouseColor(asgn.nearestWarehouseIndex)

    ctx.beginPath()
    ctx.strokeStyle = color.line
    ctx.lineWidth = 1.2
    ctx.setLineDash([4, 3])
    ctx.moveTo(cPos.x, cPos.y)
    ctx.lineTo(wPos.x, wPos.y)
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Draws customer nodes with radius proportional to demand.
 */
export function drawCustomers(
  ctx: CanvasRenderingContext2D,
  customers: Customer[],
  assignments: CustomerAssignment[],
  bounds: WarehouseBounds,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  ctx.save()

  const asgnMap = new Map<string, CustomerAssignment>()
  assignments.forEach((a) => asgnMap.set(a.customerId, a))

  for (const cust of customers) {
    const pos = toCanvasCoords(cust, bounds, canvasSize, padding)
    const radius = getCustomerRadius(cust.demand)
    const asgn = asgnMap.get(cust.id)
    const color = asgn ? getWarehouseColor(asgn.nearestWarehouseIndex) : null

    // Glow aura
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius + 2, 0, Math.PI * 2)
    ctx.fillStyle = color ? color.bg : 'rgba(148, 163, 184, 0.15)'
    ctx.fill()

    // Outer circle
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = color ? color.main : '#64748b'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#f8fafc'
    ctx.stroke()

    // Demand text label if radius is large enough, or just id
    ctx.fillStyle = '#ffffff'
    ctx.font = radius >= 8 ? 'bold 9px sans-serif' : '8px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${cust.demand}`, pos.x, pos.y)

    // Customer ID above
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '9px monospace'
    ctx.fillText(cust.id, pos.x, pos.y - radius - 5)
  }

  ctx.restore()
}

/**
 * Draws warehouse nodes as distinct highlighted square icons with labels and badge counts.
 */
export function drawWarehouses(
  ctx: CanvasRenderingContext2D,
  warehouses: WarehouseLocation[],
  bounds: WarehouseBounds,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  ctx.save()

  for (const wh of warehouses) {
    const pos = toCanvasCoords(wh, bounds, canvasSize, padding)
    const color = getWarehouseColor(wh.index)
    const size = 26

    // Pulsing outer halo
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, size * 0.9, 0, Math.PI * 2)
    ctx.fillStyle = color.bg
    ctx.fill()
    ctx.strokeStyle = color.light
    ctx.lineWidth = 1
    ctx.stroke()

    // Warehouse rounded square base
    const half = size / 2
    ctx.beginPath()
    const x = pos.x - half
    const y = pos.y - half
    const radius = 5

    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + size - radius, y)
    ctx.quadraticCurveTo(x + size, y, x + size, y + radius)
    ctx.lineTo(x + size, y + size - radius)
    ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size)
    ctx.lineTo(x + radius, y + size)
    ctx.quadraticCurveTo(x, y + size, x, y + size - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()

    ctx.fillStyle = color.main
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    // Inner icon text "W#"
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`W${wh.index + 1}`, pos.x, pos.y)

    // Sub-badge: customers served
    ctx.font = '9px monospace'
    ctx.fillStyle = color.light
    ctx.fillText(`(${wh.assignedCustomers} customers)`, pos.x, pos.y + half + 10)
  }

  ctx.restore()
}
