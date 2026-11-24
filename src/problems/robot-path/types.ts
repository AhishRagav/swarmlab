/**
 * Types for the 2D Robot Path Planning Problem.
 */

export interface Point2D {
  x: number
  y: number
}

export interface Obstacle {
  id: string
  x: number // Top-left X coordinate in world space
  y: number // Top-left Y coordinate in world space
  width: number
  height: number
}

export interface EnvironmentConfig {
  mapWidth: number
  mapHeight: number
  start: Point2D
  goal: Point2D
  obstacles: Obstacle[]
  intermediateWaypoints: number
  smoothnessWeight: number
}

export interface PathValidationResult {
  isValid: boolean
  reason?: string
  collidingObstacleId?: string
  collidingSegmentIndex?: number
}

export interface RobotPathMetrics {
  length: number
  smoothness: number
  fitness: number
}

export interface EnvironmentValidationResult {
  isValid: boolean
  errors: string[]
}

export interface InitializationDiagnostics {
  particlesRequested: number
  feasibleParticlesCount: number
  rejectedCandidatesCount: number
  totalAttempts: number
  status: 'feasible' | 'infeasible'
}
