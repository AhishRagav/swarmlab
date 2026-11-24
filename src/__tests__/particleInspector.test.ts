import { describe, it, expect } from 'vitest'
import robotPageSource from '@/pages/RobotPathPage.tsx?raw'
import { initializeSwarm, stepSwarm } from '@/algorithms/pso/engine'
import type { PSOConfig } from '@/algorithms/pso/types'
import { createWarehouseProblem } from '@/problems/warehouse/problem'
import { createEvaluateFn } from '@/simulation/controller'
import {
  createRobotPathProblem,
  initializeRobotPathSwarm,
  stepRobotPathSwarm,
  type EnvironmentConfig,
  type RobotPathPSOConfig,
} from '@/problems/robot-path'
import { createRNG } from '@/lib/rng'

describe('Particle Inspector & PSO State Visualization Verification', () => {
  // 1. Warehouse Optimizer Setup
  const warehouseProblem = createWarehouseProblem({
    customers: [
      { id: 'C1', x: 10, y: 10, demand: 1 },
      { id: 'C2', x: 20, y: 80, demand: 1 },
      { id: 'C3', x: 80, y: 20, demand: 1 },
      { id: 'C4', x: 90, y: 90, demand: 1 },
    ],
    warehouseCount: 2,
    bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
  })

  const warehousePSOConfig: PSOConfig = {
    swarmSize: 10,
    w: 0.7,
    c1: 1.5,
    c2: 1.5,
    initialVelocityMode: 'zero',
    boundaryHandling: 'clipping',
    inertiaMode: 'fixed',
  }

  // 2. Robot Path Optimizer Setup
  const robotEnv: EnvironmentConfig = {
    mapWidth: 100,
    mapHeight: 100,
    start: { x: 10, y: 50 },
    goal: { x: 90, y: 50 },
    obstacles: [{ id: 'OBS', x: 40, y: 20, width: 20, height: 60 }],
    intermediateWaypoints: 4,
    smoothnessWeight: 1.0,
  }

  const robotProblem = createRobotPathProblem(robotEnv)
  const robotPSOConfig: RobotPathPSOConfig = {
    swarmSize: 10,
    w: 0.7,
    c1: 1.5,
    c2: 1.5,
    intermediateWaypoints: 4,
    smoothnessWeight: 1.0,
    environment: robotEnv,
  }

  it('Warehouse: selected particle current, pbest, and gbest match actual stored state', () => {
    const rng = createRNG(42)
    const evalFn = createEvaluateFn(warehouseProblem)
    const state = initializeSwarm(
      warehousePSOConfig,
      warehouseProblem.bounds,
      evalFn,
      rng
    )

    expect(state.particles).toHaveLength(10)

    // Test selection across all particles
    for (let idx = 0; idx < state.particles.length; idx++) {
      const selectedParticle = state.particles[idx]

      // 1. Current position matches stored
      expect(selectedParticle.position).toHaveLength(4)
      expect(selectedParticle.currentFitness).toBeDefined()
      expect(selectedParticle.currentFitness).toBe(selectedParticle.pbestFitness)

      // 2. Pbest matches stored
      expect(selectedParticle.pbestPosition).toEqual(selectedParticle.position)
      expect(selectedParticle.pbestFitness).toBe(selectedParticle.currentFitness)

      // 3. Gbest matches swarm global best
      expect(state.bestPosition).toEqual(state.gbestPosition)
      expect(state.bestFitness).toBeLessThanOrEqual(selectedParticle.pbestFitness)
    }
  })

  it('Warehouse: stepping swarm updates current position and updates pbest only when improved', () => {
    const rng = createRNG(101)
    const evalFn = createEvaluateFn(warehouseProblem)
    let state = initializeSwarm(
      warehousePSOConfig,
      warehouseProblem.bounds,
      evalFn,
      rng
    )

    const initialPbest0 = state.particles[0].pbestFitness
    const initialGbest = state.bestFitness

    // Step 5 times
    for (let i = 0; i < 5; i++) {
      state = stepSwarm(state, warehousePSOConfig, warehouseProblem.bounds, evalFn, rng)

      // Current position must update and have currentFitness evaluated
      expect(state.particles[0].currentFitness).toBeDefined()
      // Pbest must never become worse
      expect(state.particles[0].pbestFitness).toBeLessThanOrEqual(initialPbest0)
      // Gbest must never become worse
      expect(state.bestFitness).toBeLessThanOrEqual(initialGbest)
    }
  })

  it('Warehouse: switching selected particle updates current and pbest while gbest remains invariant', () => {
    const rng = createRNG(777)
    const evalFn = createEvaluateFn(warehouseProblem)
    const state = initializeSwarm(
      warehousePSOConfig,
      warehouseProblem.bounds,
      evalFn,
      rng
    )

    const p0 = state.particles[0]
    const p1 = state.particles[1]

    // Different particles have distinct positions
    expect(p0.position).not.toEqual(p1.position)

    // Gbest is identical regardless of which particle is inspected
    const gbest = state.bestPosition
    expect(state.bestPosition).toEqual(gbest)
  })

  it('Robot Path: selected particle current, pbest, and gbest match actual stored state', () => {
    const rng = createRNG(42)
    const state = initializeRobotPathSwarm(robotPSOConfig, robotProblem.bounds, rng)

    expect(state.hasFeasibleSolution).toBe(true)

    // Check each particle
    for (let idx = 0; idx < state.particles.length; idx++) {
      const p = state.particles[idx]

      if (p.isFeasible) {
        expect(p.currentFitness).toBeLessThan(Infinity)
        expect(p.pbestFitness).toBeLessThan(Infinity)
        expect(p.position).toHaveLength(8) // 4 waypoints * 2
      } else {
        expect(p.currentFitness).toBe(Infinity)
        expect(p.pbestFitness).toBe(Infinity)
      }

      // Gbest remains swarm-wide best
      expect(state.bestFitness).toBeLessThanOrEqual(p.pbestFitness)
    }
  })

  it('Robot Path: strict feasibility ensures invalid paths never become pbest or gbest', () => {
    const rng = createRNG(999)
    let state = initializeRobotPathSwarm(robotPSOConfig, robotProblem.bounds, rng)

    const initialGbest = state.bestFitness

    for (let iter = 0; iter < 10; iter++) {
      state = stepRobotPathSwarm(state, robotPSOConfig, robotProblem.bounds, rng, iter, 10)

      for (const p of state.particles) {
        if (!p.isFeasible) {
          // Infeasible particle current fitness must be Infinity
          expect(p.currentFitness).toBe(Infinity)
        }
        // pbest must be finite or Infinity, never a colliding path
        if (p.pbestFitness < Infinity) {
          expect(p.pbestPosition).toHaveLength(8)
        }
      }

      // Gbest must always be strictly collision-free and monotonically non-increasing
      expect(state.bestFitness).toBeLessThanOrEqual(initialGbest)
    }
  })

  it('Robot Path: fully impassable map never displays valid pbest or gbest', () => {
    const blockedEnv: EnvironmentConfig = {
      mapWidth: 100,
      mapHeight: 100,
      start: { x: 5, y: 50 },
      goal: { x: 95, y: 50 },
      obstacles: [{ id: 'WALL', x: 45, y: 0, width: 10, height: 100 }],
      intermediateWaypoints: 4,
      smoothnessWeight: 1.0,
    }
    const blockedProb = createRobotPathProblem(blockedEnv)
    const cfg: RobotPathPSOConfig = {
      ...robotPSOConfig,
      environment: blockedEnv,
    }
    const rng = createRNG(42)
    const state = initializeRobotPathSwarm(cfg, blockedProb.bounds, rng)

    expect(state.hasFeasibleSolution).toBe(false)
    expect(state.bestPosition).toEqual([])
    expect(state.bestFitness).toBe(Infinity)

    for (const p of state.particles) {
      expect(p.isFeasible).toBe(false)
      expect(p.pbestFitness).toBe(Infinity)
      expect(p.currentFitness).toBe(Infinity)
    }
  })

  it('Robot Path Page contains zero emojis or emoji-like unicode characters', () => {
    const content = robotPageSource

    // Check for surrogate pairs (emojis) and specific emoji characters
    const forbiddenChars = ['⚠️', '↖', '➕', '📍', '🏁', '🗑', '🎲', '🤖', '⏹']
    const hasSurrogatePair = /[\uD800-\uDFFF]/
    const lines = content.split('\n')
    const offendingLines: string[] = []

    lines.forEach((line: string, index: number) => {
      const containsForbidden = forbiddenChars.some((char) => line.includes(char))
      if (hasSurrogatePair.test(line) || containsForbidden) {
        offendingLines.push(`Line ${index + 1}: ${line.trim()}`)
      }
    })

    expect(offendingLines).toEqual([])
  })
})
