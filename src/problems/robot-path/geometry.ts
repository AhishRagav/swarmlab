import type { Obstacle, Point2D } from './types'

export const EPSILON = 1e-7

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function euclideanDistance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

/**
 * Checks if a point lies strictly inside or on the boundary of an axis-aligned rectangular obstacle.
 * Obstacles are treated as closed forbidden sets: [x, x + width] × [y, y + height].
 */
export function isPointInOrOnObstacle(
  p: Point2D,
  obs: Obstacle,
  tolerance = EPSILON
): boolean {
  const minX = obs.x
  const maxX = obs.x + obs.width
  const minY = obs.y
  const maxY = obs.y + obs.height

  return (
    p.x >= minX - tolerance &&
    p.x <= maxX + tolerance &&
    p.y >= minY - tolerance &&
    p.y <= maxY + tolerance
  )
}

/**
 * Robust segment-versus-closed-rectangle intersection using the Liang-Barsky parametric algorithm.
 * Handles:
 *  - Segments completely inside the rectangle
 *  - Segments crossing the rectangle
 *  - Segments touching an edge or corner
 *  - Segments running collinear along a boundary edge
 *  - Segments with one or both endpoints on or inside the boundary
 * Returns true if ANY part of the segment touches or crosses the obstacle rectangle.
 */
export function segmentIntersectsObstacle(
  p1: Point2D,
  p2: Point2D,
  obs: Obstacle,
  tolerance = EPSILON
): boolean {
  const minX = obs.x
  const maxX = obs.x + obs.width
  const minY = obs.y
  const maxY = obs.y + obs.height

  // 1. Direct endpoint checks: if either endpoint is inside or on the obstacle boundary
  if (isPointInOrOnObstacle(p1, obs, tolerance) || isPointInOrOnObstacle(p2, obs, tolerance)) {
    return true
  }

  // 2. Degenerate zero-length segment: endpoints checked above, so it's safe
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  if (Math.abs(dx) < tolerance && Math.abs(dy) < tolerance) {
    return false
  }

  // 3. Liang-Barsky algorithm for parameter t in [0, 1]
  // In closed rectangle: p_k * t <= q_k for 4 clipping boundaries
  let tEnter = 0.0
  let tExit = 1.0

  const p = [-dx, dx, -dy, dy]
  const q = [
    p1.x - minX, // Left
    maxX - p1.x, // Right
    p1.y - minY, // Bottom / Top (minY)
    maxY - p1.y, // Top / Bottom (maxY)
  ]

  for (let i = 0; i < 4; i++) {
    const p_i = p[i]
    const q_i = q[i]

    if (Math.abs(p_i) < tolerance) {
      // Line is parallel to this clipping boundary
      // If q_i < -tolerance, line is completely outside this boundary
      if (q_i < -tolerance) {
        return false
      }
      // If -tolerance <= q_i <= tolerance, the line is collinear with this boundary.
      // Continue checking the other dimension's span.
    } else {
      const t = q_i / p_i
      if (p_i < 0) {
        // Entering boundary
        if (t > tEnter) {
          tEnter = t
        }
      } else {
        // Exiting boundary
        if (t < tExit) {
          tExit = t
        }
      }

      if (tEnter > tExit + tolerance) {
        return false
      }
    }
  }

  // Segment intersects closed rectangle if [tEnter, tExit] overlaps [0, 1]
  return tEnter <= 1.0 + tolerance && tExit >= 0.0 - tolerance && tEnter <= tExit + tolerance
}

/**
 * Calculates turning angle in radians between consecutive direction vectors v1 and v2.
 * Returns unsigned angle in [0, π].
 * Handles zero-length vectors and floating-point errors safely.
 */
export function calculateTurnAngle(v1: Point2D, v2: Point2D): number {
  const len1 = Math.hypot(v1.x, v1.y)
  const len2 = Math.hypot(v2.x, v2.y)

  if (len1 < 1e-9 || len2 < 1e-9) {
    return 0
  }

  const dot = v1.x * v2.x + v1.y * v2.y
  const cosTheta = Math.max(-1, Math.min(1, dot / (len1 * len2)))
  return Math.acos(cosTheta)
}

/**
 * Reconstructs the complete ordered sequence of path points from particle coordinates.
 * Path = [Start, W_1, W_2, ..., W_K, Goal]
 */
export function extractPathPoints(
  position: number[],
  start: Point2D,
  goal: Point2D
): Point2D[] {
  const points: Point2D[] = [start]
  const k = Math.floor(position.length / 2)

  for (let i = 0; i < k; i++) {
    points.push({
      x: position[2 * i],
      y: position[2 * i + 1],
    })
  }

  points.push(goal)
  return points
}
