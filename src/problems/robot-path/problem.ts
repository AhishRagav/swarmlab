import type { ProblemDefinition } from '../types'
import { extractPathPoints } from './geometry'
import { validatePath } from './collision'
import { calculateRobotPathFitness } from './fitness'
import type { EnvironmentConfig, Obstacle, Point2D } from './types'
import { createRNG } from '@/lib/rng'

export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  mapWidth: 100,
  mapHeight: 100,
  start: { x: 10, y: 10 },
  goal: { x: 90, y: 90 },
  obstacles: [
    { id: 'OBS-1', x: 25, y: 15, width: 20, height: 35 },
    { id: 'OBS-2', x: 55, y: 50, width: 25, height: 35 },
    { id: 'OBS-3', x: 20, y: 65, width: 25, height: 20 },
  ],
  intermediateWaypoints: 5,
  smoothnessWeight: 1.0,
}

/**
 * Generates random, collision-free rectangular obstacles within map boundaries.
 * Guarantees that neither start nor goal point is enclosed or touched.
 */
export function generateRandomObstacles(
  count: number,
  env: { mapWidth: number; mapHeight: number; start: Point2D; goal: Point2D },
  seed?: number
): Obstacle[] {
  const rng = createRNG(seed)
  const obstacles: Obstacle[] = []
  const margin = 8 // Safety distance around start and goal

  let attempts = 0
  const maxAttempts = count * 40

  while (obstacles.length < count && attempts < maxAttempts) {
    attempts++

    // Width and height in [10, 25] scaled to map size
    const width = Math.round(10 + rng.random() * 18)
    const height = Math.round(10 + rng.random() * 18)

    // Position within map
    const x = Math.round(rng.random() * (env.mapWidth - width))
    const y = Math.round(rng.random() * (env.mapHeight - height))

    // Check distance to start
    const startOverlap =
      env.start.x >= x - margin &&
      env.start.x <= x + width + margin &&
      env.start.y >= y - margin &&
      env.start.y <= y + height + margin

    // Check distance to goal
    const goalOverlap =
      env.goal.x >= x - margin &&
      env.goal.x <= x + width + margin &&
      env.goal.y >= y - margin &&
      env.goal.y <= y + height + margin

    if (!startOverlap && !goalOverlap) {
      obstacles.push({
        id: `OBS-${obstacles.length + 1}`,
        x,
        y,
        width,
        height,
      })
    }
  }

  return obstacles
}

/**
 * Creates the ProblemDefinition for the Robot Path Planning problem.
 * Vector dimensionality = 2 * intermediateWaypoints.
 * Vector = [x1, y1, x2, y2, ..., xK, yK].
 */
export function createRobotPathProblem(envConfig: EnvironmentConfig): ProblemDefinition {
  const k = Math.max(1, Math.floor(envConfig.intermediateWaypoints))
  const dimensions = 2 * k

  const bounds: [number, number][] = []
  for (let i = 0; i < k; i++) {
    bounds.push([0, envConfig.mapWidth])
    bounds.push([0, envConfig.mapHeight])
  }

  return {
    id: 'robot-path-optimizer',
    name: 'Robot Path Planning Optimizer',
    description: '2D continuous robot path planning with obstacle avoidance and smoothness optimization',
    dimensions,
    bounds,
    objective: 'minimize',
    evaluate: (position: number[]) => {
      const points = extractPathPoints(position, envConfig.start, envConfig.goal)
      const validation = validatePath(points, envConfig.obstacles, envConfig.mapWidth, envConfig.mapHeight)

      if (!validation.isValid) {
        // Strict rejection: invalid paths return Infinity so they can never be favored
        return Infinity
      }

      const metrics = calculateRobotPathFitness(points, envConfig.smoothnessWeight)
      return metrics.fitness
    },
  }
}
