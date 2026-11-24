import type { Obstacle, Point2D } from '@/problems/robot-path'

export interface CanvasPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export const DEFAULT_CANVAS_PADDING: CanvasPadding = {
  top: 25,
  right: 25,
  bottom: 35,
  left: 45,
}

/**
 * Transforms world coordinates (X, Y) to canvas pixel coordinates.
 */
export function toCanvasCoords(
  point: Point2D,
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
): Point2D {
  const plotWidth = Math.max(1, canvasSize.width - padding.left - padding.right)
  const plotHeight = Math.max(1, canvasSize.height - padding.top - padding.bottom)

  const normX = Math.max(0, Math.min(1, point.x / Math.max(1e-5, mapWidth)))
  const normY = Math.max(0, Math.min(1, point.y / Math.max(1e-5, mapHeight)))

  return {
    x: padding.left + normX * plotWidth,
    y: canvasSize.height - padding.bottom - normY * plotHeight,
  }
}

/**
 * Transforms canvas pixel coordinates to world coordinates (X, Y).
 */
export function toWorldCoords(
  pixel: Point2D,
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
): Point2D {
  const plotWidth = Math.max(1, canvasSize.width - padding.left - padding.right)
  const plotHeight = Math.max(1, canvasSize.height - padding.top - padding.bottom)

  const normX = (pixel.x - padding.left) / plotWidth
  const normY = (canvasSize.height - padding.bottom - pixel.y) / plotHeight

  return {
    x: Math.round(Math.max(0, Math.min(mapWidth, normX * mapWidth)) * 10) / 10,
    y: Math.round(Math.max(0, Math.min(mapHeight, normY * mapHeight)) * 10) / 10,
  }
}

/**
 * Draws coordinate axes, labels, and background grid lines on canvas.
 */
export function drawGridAndAxes(
  ctx: CanvasRenderingContext2D,
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  const { width, height } = canvasSize
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  ctx.save()

  // Background
  ctx.fillStyle = '#111315'
  ctx.fillRect(0, 0, width, height)

  // Plot Area
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

    // Vertical line & X tick
    const x = padding.left + fraction * plotWidth
    const worldX = fraction * mapWidth

    ctx.beginPath()
    ctx.moveTo(x, padding.top)
    ctx.lineTo(x, height - padding.bottom)
    ctx.stroke()

    ctx.fillText(worldX.toFixed(0), x, height - padding.bottom + 14)

    // Horizontal line & Y tick
    const y = height - padding.bottom - fraction * plotHeight
    const worldY = fraction * mapHeight

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

  // Axis Labels
  ctx.fillStyle = '#a1a1aa'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('X Position (m)', padding.left + plotWidth / 2, height - 10)

  ctx.save()
  ctx.translate(14, padding.top + plotHeight / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Y Position (m)', 0, 0)
  ctx.restore()

  ctx.restore()
}

/**
 * Draws obstacles on canvas as solid rounded rectangles with subtle stroke and ID labels.
 */
export function drawObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: Obstacle[],
  selectedId: string | null,
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  ctx.save()

  for (const obs of obstacles) {
    const isSelected = obs.id === selectedId

    // Obstacle world coordinates: x is left, y is bottom in world space
    // Canvas: top-left corner corresponds to (obs.x, obs.y + obs.height)
    const topLeft = toCanvasCoords(
      { x: obs.x, y: obs.y + obs.height },
      mapWidth,
      mapHeight,
      canvasSize,
      padding
    )
    const bottomRight = toCanvasCoords(
      { x: obs.x + obs.width, y: obs.y },
      mapWidth,
      mapHeight,
      canvasSize,
      padding
    )

    const w = bottomRight.x - topLeft.x
    const h = bottomRight.y - topLeft.y

    // Obstacle body
    ctx.beginPath()
    ctx.rect(topLeft.x, topLeft.y, w, h)
    ctx.fillStyle = isSelected ? '#3f454d' : '#272b30'
    ctx.fill()

    ctx.strokeStyle = isSelected ? '#f59e0b' : '#4b5563'
    ctx.lineWidth = isSelected ? 2 : 1.2
    ctx.stroke()

    // Identifier text
    ctx.fillStyle = isSelected ? '#f59e0b' : '#9ca3af'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(obs.id, topLeft.x + w / 2, topLeft.y + h / 2)

    // Resize handle for selected obstacle at bottom-right
    if (isSelected) {
      ctx.fillStyle = '#f59e0b'
      ctx.fillRect(bottomRight.x - 4, bottomRight.y - 4, 8, 8)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.strokeRect(bottomRight.x - 4, bottomRight.y - 4, 8, 8)
    }
  }

  ctx.restore()
}

/**
 * Draws Start (Green) and Goal (Red) markers with distinct icons and halo.
 */
export function drawEndpoints(
  ctx: CanvasRenderingContext2D,
  start: Point2D,
  goal: Point2D,
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  ctx.save()

  // Start (Green)
  const sPos = toCanvasCoords(start, mapWidth, mapHeight, canvasSize, padding)
  ctx.beginPath()
  ctx.arc(sPos.x, sPos.y, 11, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(34, 197, 94, 0.25)'
  ctx.fill()
  ctx.strokeStyle = '#22c55e'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(sPos.x, sPos.y, 7, 0, Math.PI * 2)
  ctx.fillStyle = '#22c55e'
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('S', sPos.x, sPos.y)

  ctx.fillStyle = '#22c55e'
  ctx.font = '10px monospace'
  ctx.fillText('Start', sPos.x, sPos.y - 15)

  // Goal (Red)
  const gPos = toCanvasCoords(goal, mapWidth, mapHeight, canvasSize, padding)
  ctx.beginPath()
  ctx.arc(gPos.x, gPos.y, 11, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'
  ctx.fill()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(gPos.x, gPos.y, 7, 0, Math.PI * 2)
  ctx.fillStyle = '#ef4444'
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('G', gPos.x, gPos.y)

  ctx.fillStyle = '#ef4444'
  ctx.font = '10px monospace'
  ctx.fillText('Goal', gPos.x, gPos.y - 15)

  ctx.restore()
}

/**
 * Draws candidate swarm paths as thin, semi-transparent lines.
 */
export function drawCandidatePaths(
  ctx: CanvasRenderingContext2D,
  paths: Point2D[][],
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  if (paths.length === 0) return

  ctx.save()
  ctx.strokeStyle = 'rgba(161, 161, 170, 0.18)'
  ctx.lineWidth = 1

  for (const path of paths) {
    if (path.length < 2) continue

    ctx.beginPath()
    const first = toCanvasCoords(path[0], mapWidth, mapHeight, canvasSize, padding)
    ctx.moveTo(first.x, first.y)

    for (let i = 1; i < path.length; i++) {
      const pt = toCanvasCoords(path[i], mapWidth, mapHeight, canvasSize, padding)
      ctx.lineTo(pt.x, pt.y)
    }

    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Draws the selected particle's Current Position path as a thin grey line.
 */
export function drawCurrentPath(
  ctx: CanvasRenderingContext2D,
  path: Point2D[],
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  if (path.length < 2) return

  ctx.save()

  ctx.beginPath()
  const first = toCanvasCoords(path[0], mapWidth, mapHeight, canvasSize, padding)
  ctx.moveTo(first.x, first.y)

  for (let i = 1; i < path.length; i++) {
    const pt = toCanvasCoords(path[i], mapWidth, mapHeight, canvasSize, padding)
    ctx.lineTo(pt.x, pt.y)
  }

  ctx.strokeStyle = '#71717a'
  ctx.lineWidth = 1.8
  ctx.setLineDash([3, 2])
  ctx.stroke()
  ctx.setLineDash([])

  // Waypoints
  for (let i = 1; i < path.length - 1; i++) {
    const pt = toCanvasCoords(path[i], mapWidth, mapHeight, canvasSize, padding)
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#a1a1aa'
    ctx.fill()
    ctx.strokeStyle = '#3f454d'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Draws the selected particle's Personal Best (Pbest) path as a distinct blue line.
 */
export function drawPbestPath(
  ctx: CanvasRenderingContext2D,
  path: Point2D[],
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  if (path.length < 2) return

  ctx.save()

  // Subtle blue outer glow
  ctx.beginPath()
  const first = toCanvasCoords(path[0], mapWidth, mapHeight, canvasSize, padding)
  ctx.moveTo(first.x, first.y)

  for (let i = 1; i < path.length; i++) {
    const pt = toCanvasCoords(path[i], mapWidth, mapHeight, canvasSize, padding)
    ctx.lineTo(pt.x, pt.y)
  }

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'
  ctx.lineWidth = 5
  ctx.stroke()

  // Inner solid blue line
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // Blue waypoint nodes
  for (let i = 1; i < path.length - 1; i++) {
    const pt = toCanvasCoords(path[i], mapWidth, mapHeight, canvasSize, padding)
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2)
    ctx.fillStyle = '#60a5fa'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Draws the Global Best path as a prominent, thick amber line with waypoint nodes.
 */
export function drawGlobalBestPath(
  ctx: CanvasRenderingContext2D,
  path: Point2D[],
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  if (path.length < 2) return

  ctx.save()

  // Outer glowing halo
  ctx.beginPath()
  const first = toCanvasCoords(path[0], mapWidth, mapHeight, canvasSize, padding)
  ctx.moveTo(first.x, first.y)

  for (let i = 1; i < path.length; i++) {
    const pt = toCanvasCoords(path[i], mapWidth, mapHeight, canvasSize, padding)
    ctx.lineTo(pt.x, pt.y)
  }

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)'
  ctx.lineWidth = 7
  ctx.stroke()

  // Inner solid path
  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 3
  ctx.stroke()

  // Intermediate waypoint nodes
  for (let i = 1; i < path.length - 1; i++) {
    const pt = toCanvasCoords(path[i], mapWidth, mapHeight, canvasSize, padding)
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#fbbf24'
    ctx.fill()
    ctx.strokeStyle = '#111315'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.restore()
}

/**
 * Draws the directional robot icon along the path during animation.
 */
export function drawRobot(
  ctx: CanvasRenderingContext2D,
  position: Point2D,
  heading: number, // In radians
  mapWidth: number,
  mapHeight: number,
  canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING
) {
  const pixel = toCanvasCoords(position, mapWidth, mapHeight, canvasSize, padding)

  ctx.save()
  ctx.translate(pixel.x, pixel.y)
  // Standard screen Y is inverted relative to Cartesian math Y
  ctx.rotate(-heading)

  // Robot chassis outer circle
  ctx.beginPath()
  ctx.arc(0, 0, 11, 0, Math.PI * 2)
  ctx.fillStyle = '#f59e0b'
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.stroke()

  // Forward pointer triangle / arrow
  ctx.beginPath()
  ctx.moveTo(9, 0)
  ctx.lineTo(-4, -6)
  ctx.lineTo(-1, 0)
  ctx.lineTo(-4, 6)
  ctx.closePath()
  ctx.fillStyle = '#111315'
  ctx.fill()

  ctx.restore()
}

/**
 * Draws a clean on-canvas legend for the Robot Path canvas.
 */
export function drawPathLegend(
  ctx: CanvasRenderingContext2D,
  _canvasSize: { width: number; height: number },
  padding: CanvasPadding = DEFAULT_CANVAS_PADDING,
  showCurrent: boolean = true,
  showPbest: boolean = true,
  showGbest: boolean = true
) {
  ctx.save()
  const items = [
    { label: 'Current Pos', color: '#71717a', active: showCurrent, type: 'line' as const },
    { label: 'Pbest', color: '#3b82f6', active: showPbest, type: 'line' as const },
    { label: 'Gbest', color: '#f59e0b', active: showGbest, type: 'line' as const },
    { label: 'Start / Goal', color: '#22c55e', active: true, type: 'dot' as const },
  ]

  const x = padding.left + 8
  let y = padding.top + 8
  const itemH = 14

  ctx.fillStyle = 'rgba(25, 29, 33, 0.88)'
  ctx.strokeStyle = '#3f454d'
  ctx.lineWidth = 1
  ctx.fillRect(x - 4, y - 4, 105, items.length * itemH + 6)
  ctx.strokeRect(x - 4, y - 4, 105, items.length * itemH + 6)

  ctx.font = '9px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  for (const item of items) {
    if (item.type === 'line') {
      ctx.beginPath()
      ctx.moveTo(x + 1, y + itemH / 2)
      ctx.lineTo(x + 11, y + itemH / 2)
      ctx.strokeStyle = item.active ? item.color : '#3f454d'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(x + 6, y + itemH / 2, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = item.color
      ctx.fill()
    }

    ctx.fillStyle = item.active ? '#f5f5f4' : '#71717a'
    ctx.fillText(item.label, x + 16, y + itemH / 2)
    y += itemH
  }

  ctx.restore()
}
