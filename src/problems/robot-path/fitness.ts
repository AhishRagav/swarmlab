import { calculateTurnAngle, euclideanDistance } from './geometry'
import type { Point2D, RobotPathMetrics } from './types'

/**
 * Calculates total path length by summing Euclidean distances of all consecutive segments.
 */
export function calculatePathLength(points: Point2D[]): number {
  if (points.length < 2) return 0

  let totalLength = 0
  for (let i = 0; i < points.length - 1; i++) {
    totalLength += euclideanDistance(points[i], points[i + 1])
  }

  return totalLength
}

/**
 * Calculates total path smoothness penalty by summing direction changes between consecutive segments.
 * Smoothness penalty S = sum of turning angles (in radians, [0, π]) between consecutive vectors.
 * A straight path has S = 0.
 */
export function calculatePathSmoothness(points: Point2D[]): number {
  if (points.length < 3) return 0

  let totalAngle = 0
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    const v1: Point2D = { x: curr.x - prev.x, y: curr.y - prev.y }
    const v2: Point2D = { x: next.x - curr.x, y: next.y - curr.y }

    totalAngle += calculateTurnAngle(v1, v2)
  }

  return totalAngle
}

/**
 * Calculates the combined fitness of a validated, collision-free robot path:
 * F(P) = L + lambdaSmoothness * S
 * Where L is path length and S is smoothness penalty.
 * Lower fitness is better (minimization problem).
 */
export function calculateRobotPathFitness(
  points: Point2D[],
  smoothnessWeight: number
): RobotPathMetrics {
  // Special zero-length case where start equals goal
  if (
    points.length >= 2 &&
    points[0].x === points[points.length - 1].x &&
    points[0].y === points[points.length - 1].y &&
    points.length === 2
  ) {
    return {
      length: 0,
      smoothness: 0,
      fitness: 0,
    }
  }

  const length = calculatePathLength(points)
  const smoothness = calculatePathSmoothness(points)
  const fitness = length + Math.max(0, smoothnessWeight) * smoothness

  return {
    length,
    smoothness,
    fitness,
  }
}
