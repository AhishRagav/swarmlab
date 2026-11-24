import { isPointInOrOnObstacle, segmentIntersectsObstacle } from './geometry'
import type { EnvironmentConfig, EnvironmentValidationResult, Obstacle, PathValidationResult, Point2D } from './types'

/**
 * Validates the entire environment configuration before simulation.
 * Rejects:
 *  - Invalid or non-finite map dimensions
 *  - Start or goal outside map
 *  - Start or goal inside or touching an obstacle
 *  - Non-finite coordinates
 *  - Obstacles with zero, negative, or non-finite dimensions
 *  - Obstacles extending outside map boundaries
 */
export function validateEnvironment(config: EnvironmentConfig): EnvironmentValidationResult {
  const errors: string[] = []

  // 1. Map dimensions
  if (
    !Number.isFinite(config.mapWidth) ||
    !Number.isFinite(config.mapHeight) ||
    config.mapWidth <= 0 ||
    config.mapHeight <= 0
  ) {
    errors.push('Map dimensions must be positive finite numbers.')
  }

  // 2. Start position
  if (!Number.isFinite(config.start.x) || !Number.isFinite(config.start.y)) {
    errors.push('Start coordinates must be finite numbers.')
  } else if (
    config.start.x < 0 ||
    config.start.x > config.mapWidth ||
    config.start.y < 0 ||
    config.start.y > config.mapHeight
  ) {
    errors.push('Start point must lie within map boundaries.')
  }

  // 3. Goal position
  if (!Number.isFinite(config.goal.x) || !Number.isFinite(config.goal.y)) {
    errors.push('Goal coordinates must be finite numbers.')
  } else if (
    config.goal.x < 0 ||
    config.goal.x > config.mapWidth ||
    config.goal.y < 0 ||
    config.goal.y > config.mapHeight
  ) {
    errors.push('Goal point must lie within map boundaries.')
  }

  // 4. Obstacles
  for (let i = 0; i < config.obstacles.length; i++) {
    const obs = config.obstacles[i]
    const label = `Obstacle ${obs.id || `#${i + 1}`}`

    if (
      !Number.isFinite(obs.x) ||
      !Number.isFinite(obs.y) ||
      !Number.isFinite(obs.width) ||
      !Number.isFinite(obs.height)
    ) {
      errors.push(`${label} contains non-finite coordinates or dimensions.`)
      continue
    }

    if (obs.width <= 0 || obs.height <= 0) {
      errors.push(`${label} must have positive non-zero width and height.`)
      continue
    }

    if (
      obs.x < 0 ||
      obs.y < 0 ||
      obs.x + obs.width > config.mapWidth ||
      obs.y + obs.height > config.mapHeight
    ) {
      errors.push(`${label} extends outside the map boundaries.`)
    }

    // Check if start touches or is inside obstacle
    if (isPointInOrOnObstacle(config.start, obs)) {
      errors.push(`Start position is inside or on the boundary of ${label}.`)
    }

    // Check if goal touches or is inside obstacle
    if (isPointInOrOnObstacle(config.goal, obs)) {
      errors.push(`Goal position is inside or on the boundary of ${label}.`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates a candidate path against obstacles with strict early-exit.
 * Returns immediately upon discovering the first collision.
 */
export function validatePath(
  points: Point2D[],
  obstacles: Obstacle[],
  mapWidth?: number,
  mapHeight?: number
): PathValidationResult {
  if (points.length < 2) {
    return { isValid: false, reason: 'Path must contain at least start and goal points.' }
  }

  // Check point finiteness and bounds
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      return { isValid: false, reason: `Waypoint ${i} contains non-finite coordinates.` }
    }

    if (mapWidth !== undefined && mapHeight !== undefined) {
      if (p.x < 0 || p.x > mapWidth || p.y < 0 || p.y > mapHeight) {
        return { isValid: false, reason: `Waypoint ${i} is outside map boundaries.` }
      }
    }
  }

  if (obstacles.length === 0) {
    return { isValid: true }
  }

  // Check every consecutive segment against every obstacle with early exit
  for (let s = 0; s < points.length - 1; s++) {
    const p1 = points[s]
    const p2 = points[s + 1]

    for (let o = 0; o < obstacles.length; o++) {
      const obs = obstacles[o]
      if (segmentIntersectsObstacle(p1, p2, obs)) {
        return {
          isValid: false,
          reason: `Segment ${s} intersects obstacle ${obs.id}`,
          collidingObstacleId: obs.id,
          collidingSegmentIndex: s,
        }
      }
    }
  }

  return { isValid: true }
}
