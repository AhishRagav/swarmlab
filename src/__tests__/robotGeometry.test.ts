import { describe, it, expect } from 'vitest'
import {
  euclideanDistance,
  isPointInOrOnObstacle,
  segmentIntersectsObstacle,
  calculateTurnAngle,
  extractPathPoints,
  type Obstacle,
  type Point2D,
} from '@/problems/robot-path'
import {
  calculatePathLength,
  calculatePathSmoothness,
  calculateRobotPathFitness,
} from '@/problems/robot-path/fitness'
import {
  validateEnvironment,
  validatePath,
} from '@/problems/robot-path/collision'
import type { EnvironmentConfig } from '@/problems/robot-path/types'

describe('Robot Path Geometry & Strict Collision Rejection', () => {
  // Rectangle at [20, 40] x [20, 50]
  const obstacle: Obstacle = {
    id: 'OBS-TEST',
    x: 20,
    y: 20,
    width: 20,
    height: 30,
  }

  describe('Point in or on closed rectangle', () => {
    it('calculates euclidean distance between two points', () => {
      expect(euclideanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    })

    it('extracts path points including start and goal', () => {
      const pts = extractPathPoints([20, 20, 40, 40], { x: 0, y: 0 }, { x: 100, y: 100 })
      expect(pts).toHaveLength(4)
      expect(pts[0]).toEqual({ x: 0, y: 0 })
      expect(pts[3]).toEqual({ x: 100, y: 100 })
    })

    it('detects point strictly inside', () => {
      expect(isPointInOrOnObstacle({ x: 30, y: 35 }, obstacle)).toBe(true)
    })

    it('detects point on edges', () => {
      expect(isPointInOrOnObstacle({ x: 20, y: 35 }, obstacle)).toBe(true) // left edge
      expect(isPointInOrOnObstacle({ x: 40, y: 35 }, obstacle)).toBe(true) // right edge
      expect(isPointInOrOnObstacle({ x: 30, y: 20 }, obstacle)).toBe(true) // bottom edge
      expect(isPointInOrOnObstacle({ x: 30, y: 50 }, obstacle)).toBe(true) // top edge
    })

    it('detects point on all 4 corners', () => {
      expect(isPointInOrOnObstacle({ x: 20, y: 20 }, obstacle)).toBe(true) // bottom-left
      expect(isPointInOrOnObstacle({ x: 40, y: 20 }, obstacle)).toBe(true) // bottom-right
      expect(isPointInOrOnObstacle({ x: 20, y: 50 }, obstacle)).toBe(true) // top-left
      expect(isPointInOrOnObstacle({ x: 40, y: 50 }, obstacle)).toBe(true) // top-right
    })

    it('returns false for points strictly outside', () => {
      expect(isPointInOrOnObstacle({ x: 19.9, y: 35 }, obstacle)).toBe(false)
      expect(isPointInOrOnObstacle({ x: 40.1, y: 35 }, obstacle)).toBe(false)
      expect(isPointInOrOnObstacle({ x: 30, y: 19.9 }, obstacle)).toBe(false)
      expect(isPointInOrOnObstacle({ x: 30, y: 50.1 }, obstacle)).toBe(false)
    })
  })

  describe('Segment-versus-Obstacle Collision (All 7 mandatory cases)', () => {
    it('returns false when segment is completely outside rectangle', () => {
      const p1: Point2D = { x: 5, y: 5 }
      const p2: Point2D = { x: 15, y: 60 }
      expect(segmentIntersectsObstacle(p1, p2, obstacle)).toBe(false)
    })

    it('detects collision when segment crosses straight through the rectangle', () => {
      // Horizontal crossing
      expect(segmentIntersectsObstacle({ x: 10, y: 35 }, { x: 50, y: 35 }, obstacle)).toBe(true)
      // Vertical crossing
      expect(segmentIntersectsObstacle({ x: 30, y: 10 }, { x: 30, y: 60 }, obstacle)).toBe(true)
      // Diagonal crossing
      expect(segmentIntersectsObstacle({ x: 10, y: 10 }, { x: 50, y: 60 }, obstacle)).toBe(true)
    })

    it('detects collision when segment touches an edge', () => {
      // T-junction touching the left edge at (20, 35)
      expect(segmentIntersectsObstacle({ x: 10, y: 35 }, { x: 20, y: 35 }, obstacle)).toBe(true)
    })

    it('detects collision when segment touches a corner', () => {
      // Line touching bottom-left corner at (20, 20)
      expect(segmentIntersectsObstacle({ x: 10, y: 10 }, { x: 20, y: 20 }, obstacle)).toBe(true)
    })

    it('detects collision when segment runs along obstacle boundary', () => {
      // Running collinear along bottom edge y=20 from x=15 to x=45
      expect(segmentIntersectsObstacle({ x: 15, y: 20 }, { x: 45, y: 20 }, obstacle)).toBe(true)
    })

    it('detects collision when one or both endpoints are inside the obstacle', () => {
      expect(segmentIntersectsObstacle({ x: 25, y: 25 }, { x: 35, y: 45 }, obstacle)).toBe(true) // both inside
      expect(segmentIntersectsObstacle({ x: 10, y: 10 }, { x: 25, y: 25 }, obstacle)).toBe(true) // one inside
    })

    it('detects collision when segment crosses obstacle although both endpoints are outside', () => {
      const p1: Point2D = { x: 15, y: 35 }
      const p2: Point2D = { x: 45, y: 35 }
      expect(isPointInOrOnObstacle(p1, obstacle)).toBe(false)
      expect(isPointInOrOnObstacle(p2, obstacle)).toBe(false)
      expect(segmentIntersectsObstacle(p1, p2, obstacle)).toBe(true)
    })

    it('handles degenerate zero-length segments safely', () => {
      // Degenerate inside
      expect(segmentIntersectsObstacle({ x: 30, y: 35 }, { x: 30, y: 35 }, obstacle)).toBe(true)
      // Degenerate outside
      expect(segmentIntersectsObstacle({ x: 10, y: 10 }, { x: 10, y: 10 }, obstacle)).toBe(false)
    })
  })

  describe('Path Validation & Early Exit', () => {
    it('validates a collision-free multi-waypoint path', () => {
      const path: Point2D[] = [
        { x: 10, y: 10 },
        { x: 10, y: 60 },
        { x: 50, y: 60 },
        { x: 50, y: 10 },
      ]
      const result = validatePath(path, [obstacle], 100, 100)
      expect(result.isValid).toBe(true)
    })

    it('exits early on the very first colliding segment', () => {
      const path: Point2D[] = [
        { x: 10, y: 10 },
        { x: 30, y: 35 }, // Segment 0 collides with obstacle!
        { x: 90, y: 90 },
      ]
      const result = validatePath(path, [obstacle], 100, 100)
      expect(result.isValid).toBe(false)
      expect(result.collidingSegmentIndex).toBe(0)
      expect(result.collidingObstacleId).toBe('OBS-TEST')
    })

    it('rejects waypoints outside map boundaries', () => {
      const path: Point2D[] = [
        { x: 10, y: 10 },
        { x: 105, y: 50 }, // Out of bounds
        { x: 90, y: 90 },
      ]
      const result = validatePath(path, [], 100, 100)
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('outside map boundaries')
    })
  })

  describe('Fitness Calculation: Length & Smoothness', () => {
    it('accurately computes Euclidean path length', () => {
      const path: Point2D[] = [
        { x: 0, y: 0 },
        { x: 3, y: 4 }, // dist = 5
        { x: 3, y: 14 }, // dist = 10
      ]
      expect(calculatePathLength(path)).toBeCloseTo(15)
    })

    it('returns zero smoothness penalty for a straight path', () => {
      const path: Point2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ]
      expect(calculatePathSmoothness(path)).toBeCloseTo(0)
    })

    it('correctly calculates 90-degree turning angle', () => {
      const v1: Point2D = { x: 1, y: 0 }
      const v2: Point2D = { x: 0, y: 1 }
      expect(calculateTurnAngle(v1, v2)).toBeCloseTo(Math.PI / 2)

      const path: Point2D[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ]
      expect(calculatePathSmoothness(path)).toBeCloseTo(Math.PI / 2)
    })

    it('handles special zero-length case when start equals goal', () => {
      const path: Point2D[] = [
        { x: 25, y: 25 },
        { x: 25, y: 25 },
      ]
      const metrics = calculateRobotPathFitness(path, 1.0)
      expect(metrics.length).toBe(0)
      expect(metrics.smoothness).toBe(0)
      expect(metrics.fitness).toBe(0)
    })
  })

  describe('Environment Validation', () => {
    const validConfig: EnvironmentConfig = {
      mapWidth: 100,
      mapHeight: 100,
      start: { x: 5, y: 5 },
      goal: { x: 95, y: 95 },
      obstacles: [obstacle],
      intermediateWaypoints: 5,
      smoothnessWeight: 1.0,
    }

    it('validates a well-formed environment configuration', () => {
      expect(validateEnvironment(validConfig).isValid).toBe(true)
    })

    it('rejects start point inside an obstacle', () => {
      const invalid = { ...validConfig, start: { x: 30, y: 35 } }
      const res = validateEnvironment(invalid)
      expect(res.isValid).toBe(false)
      expect(res.errors[0]).toContain('Start position is inside')
    })

    it('rejects goal point inside an obstacle', () => {
      const invalid = { ...validConfig, goal: { x: 30, y: 35 } }
      const res = validateEnvironment(invalid)
      expect(res.isValid).toBe(false)
      expect(res.errors[0]).toContain('Goal position is inside')
    })

    it('rejects obstacles with zero or negative dimensions', () => {
      const invalid = {
        ...validConfig,
        obstacles: [{ id: 'BAD', x: 10, y: 10, width: 0, height: -5 }],
      }
      const res = validateEnvironment(invalid)
      expect(res.isValid).toBe(false)
      expect(res.errors[0]).toContain('positive non-zero width and height')
    })

    it('rejects obstacles extending outside map boundaries', () => {
      const invalid = {
        ...validConfig,
        obstacles: [{ id: 'OUT', x: 85, y: 85, width: 30, height: 30 }],
      }
      const res = validateEnvironment(invalid)
      expect(res.isValid).toBe(false)
      expect(res.errors[0]).toContain('extends outside the map boundaries')
    })
  })
})
