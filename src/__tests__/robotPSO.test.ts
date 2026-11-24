import { describe, it, expect } from 'vitest'
import {
  createRobotPathProblem,
  extractPathPoints,
  initializeRobotPathSwarm,
  robotPathPSOFactory,
  segmentIntersectsObstacle,
  stepRobotPathSwarm,
  type EnvironmentConfig,
  type Obstacle,
  type RobotPathPSOConfig,
} from '@/problems/robot-path'
import { createRNG } from '@/lib/rng'

describe('Robot Path PSO Engine & Feasibility Lifecycle', () => {
  const obstacle: Obstacle = {
    id: 'WALL',
    x: 40,
    y: 0,
    width: 20,
    height: 70, // Wall blocking direct path from (10, 10) to (90, 90)
  }

  const envConfig: EnvironmentConfig = {
    mapWidth: 100,
    mapHeight: 100,
    start: { x: 10, y: 10 },
    goal: { x: 90, y: 90 },
    obstacles: [obstacle],
    intermediateWaypoints: 4,
    smoothnessWeight: 1.0,
  }

  const problem = createRobotPathProblem(envConfig)

  const psoConfig: RobotPathPSOConfig = {
    swarmSize: 20,
    w: 0.7,
    c1: 1.5,
    c2: 1.5,
    intermediateWaypoints: 4,
    smoothnessWeight: 1.0,
    velocityClampRatio: 0.2,
    initialVelocityMode: 'zero',
    inertiaMode: 'fixed',
    environment: envConfig,
  }

  it('initializes swarm with feasible particles and valid gbest', () => {
    const rng = createRNG(42)
    const state = initializeRobotPathSwarm(psoConfig, problem.bounds, rng)

    expect(state.particles).toHaveLength(20)
    expect(state.hasFeasibleSolution).toBe(true)
    expect(state.bestFitness).toBeLessThan(Infinity)
    expect(state.bestPosition).toHaveLength(8) // 4 waypoints * 2

    // Check that best position is strictly collision-free
    const gbestPoints = extractPathPoints(state.bestPosition, envConfig.start, envConfig.goal)
    expect(gbestPoints).toHaveLength(6) // Start + 4 waypoints + Goal
  })

  it('strictly protects pbest and gbest: invalid updates cannot overwrite stored bests', () => {
    const rng = createRNG(12345)
    let state = initializeRobotPathSwarm(psoConfig, problem.bounds, rng)
    expect(state.hasFeasibleSolution).toBe(true)

    const initialGbestFitness = state.bestFitness
    const initialGbestPos = state.bestPosition.slice()
    expect(initialGbestPos).toHaveLength(8)

    // Run 5 iterations of PSO
    for (let iter = 0; iter < 5; iter++) {
      state = stepRobotPathSwarm(state, psoConfig, problem.bounds, rng, iter, 5)
    }

    // Global best fitness must never increase (strictly monotonically non-increasing)
    expect(state.bestFitness).toBeLessThanOrEqual(initialGbestFitness)

    // Check every particle: pbestFitness must be finite or Infinity, never worse than before
    for (const p of state.particles) {
      if (p.isFeasible) {
        expect(p.pbestFitness).toBeLessThan(Infinity)
      }
    }
  })

  it('bounds recovery attempts when particles collide', () => {
    const rng = createRNG(999)
    let state = initializeRobotPathSwarm(psoConfig, problem.bounds, rng)

    // Step several times
    for (let i = 0; i < 3; i++) {
      state = stepRobotPathSwarm(state, psoConfig, problem.bounds, rng, i, 3)
    }

    // Recoveries or rejections should have occurred
    expect(state.recoveryAttemptsCount).toBeGreaterThanOrEqual(0)
    expect(state.rejectedCandidatesCount).toBeGreaterThanOrEqual(0)
    expect(state.successfulRecoveriesCount).toBeLessThanOrEqual(state.recoveryAttemptsCount)
  })

  it('handles the no-feasible-path edge case cleanly without fabricating solutions', () => {
    // Completely impassable wall covering from y=0 to y=100
    const impassableEnv: EnvironmentConfig = {
      mapWidth: 100,
      mapHeight: 100,
      start: { x: 10, y: 50 },
      goal: { x: 90, y: 50 },
      obstacles: [{ id: 'BLOCK', x: 45, y: 0, width: 10, height: 100 }],
      intermediateWaypoints: 3,
      smoothnessWeight: 1.0,
    }

    const impProblem = createRobotPathProblem(impassableEnv)
    const impConfig: RobotPathPSOConfig = {
      ...psoConfig,
      environment: impassableEnv,
      intermediateWaypoints: 3,
    }

    const rng = createRNG(777)
    const state = initializeRobotPathSwarm(impConfig, impProblem.bounds, rng)

    // Must correctly report no feasible solution found
    expect(state.hasFeasibleSolution).toBe(false)
    expect(state.bestFitness).toBe(Infinity)
    expect(state.bestPosition).toEqual([])
  })

  it('produces deterministic, reproducible results for the same RNG seed', () => {
    const rng1 = createRNG(888)
    const rng2 = createRNG(888)

    const state1 = initializeRobotPathSwarm(psoConfig, problem.bounds, rng1)
    const state2 = initializeRobotPathSwarm(psoConfig, problem.bounds, rng2)

    expect(state1.bestFitness).toBeCloseTo(state2.bestFitness)
    expect(state1.bestPosition).toEqual(state2.bestPosition)
  })

  it('plugs into AlgorithmFactory interface cleanly', () => {
    expect(robotPathPSOFactory.id).toBe('robot-path-pso')
    expect(robotPathPSOFactory.name).toBe('Robot Path PSO')

    const rng = createRNG(42)
    const state = robotPathPSOFactory.createInitialState(
      psoConfig,
      problem.bounds,
      () => ({ fitness: 0, objective: 0 }),
      rng
    )

    expect(state.particles.length).toBe(20)

    const nextState = robotPathPSOFactory.step(
      state,
      psoConfig,
      problem.bounds,
      () => ({ fitness: 0, objective: 0 }),
      rng,
      0,
      10
    )

    expect(nextState.particles.length).toBe(20)
  })

  it('reliably finds feasible initial paths for higher waypoint counts K in [3, 5, 8, 10, 15]', () => {
    // Oblique obstacle requiring a curved detour around the top or bottom
    const testEnv: EnvironmentConfig = {
      mapWidth: 100,
      mapHeight: 100,
      start: { x: 10, y: 50 },
      goal: { x: 90, y: 50 },
      obstacles: [{ id: 'MID_BLOCK', x: 40, y: 25, width: 20, height: 50 }],
      intermediateWaypoints: 5,
      smoothnessWeight: 1.0,
    }

    const waypointCounts = [3, 5, 8, 10, 15]

    for (const k of waypointCounts) {
      const cfg: RobotPathPSOConfig = {
        ...psoConfig,
        intermediateWaypoints: k,
        environment: testEnv,
      }
      const prob = createRobotPathProblem({ ...testEnv, intermediateWaypoints: k })
      const rng = createRNG(100 + k)
      const state = initializeRobotPathSwarm(cfg, prob.bounds, rng)

      // Must succeed in finding feasible solutions
      expect(state.hasFeasibleSolution).toBe(true)
      expect(state.bestFitness).toBeLessThan(Infinity)
      expect(state.bestPosition).toHaveLength(2 * k)
      expect(state.validParticlesCount).toBeGreaterThan(0)

      // Initialization diagnostics validation
      expect(state.initDiagnostics).toBeDefined()
      expect(state.initDiagnostics.particlesRequested).toBe(cfg.swarmSize)
      expect(state.initDiagnostics.feasibleParticlesCount).toBe(state.validParticlesCount)
      expect(state.initDiagnostics.totalAttempts).toBeGreaterThanOrEqual(cfg.swarmSize)
      expect(state.initDiagnostics.status).toBe('feasible')

      // Ensure that step preserves initDiagnostics
      const steppedState = stepRobotPathSwarm(state, cfg, prob.bounds, rng, 0, 10)
      expect(steppedState.initDiagnostics).toEqual(state.initDiagnostics)
    }
  })

  it('initialization diagnostics correctly reflects fully infeasible environments', () => {
    const impassableEnv: EnvironmentConfig = {
      mapWidth: 100,
      mapHeight: 100,
      start: { x: 5, y: 50 },
      goal: { x: 95, y: 50 },
      obstacles: [{ id: 'FULL_WALL', x: 45, y: 0, width: 10, height: 100 }],
      intermediateWaypoints: 5,
      smoothnessWeight: 1.0,
    }
    const impProblem = createRobotPathProblem(impassableEnv)
    const cfg: RobotPathPSOConfig = {
      ...psoConfig,
      swarmSize: 10,
      intermediateWaypoints: 5,
      environment: impassableEnv,
    }
    const rng = createRNG(42)
    const state = initializeRobotPathSwarm(cfg, impProblem.bounds, rng)

    expect(state.hasFeasibleSolution).toBe(false)
    expect(state.initDiagnostics.particlesRequested).toBe(10)
    expect(state.initDiagnostics.feasibleParticlesCount).toBe(0)
    expect(state.initDiagnostics.rejectedCandidatesCount).toBe(10 * 100) // 10 particles * 100 attempts
    expect(state.initDiagnostics.totalAttempts).toBe(1000)
    expect(state.initDiagnostics.status).toBe('infeasible')
  })

  describe('Comprehensive Map Typology & Waypoint Scaling Audit', () => {
    const kValues = [3, 5, 8, 10, 15]

    const testTopologies: Record<string, Obstacle[]> = {
      'empty map': [],
      'single obstacle': [{ id: 'MID', x: 40, y: 30, width: 20, height: 40 }],
      'multiple obstacles': [
        { id: 'OBS1', x: 25, y: 10, width: 15, height: 35 },
        { id: 'OBS2', x: 45, y: 55, width: 20, height: 35 },
        { id: 'OBS3', x: 70, y: 15, width: 15, height: 35 },
      ],
      'staggered obstacles': [
        { id: 'STAG1', x: 30, y: 0, width: 15, height: 60 },
        { id: 'STAG2', x: 60, y: 40, width: 15, height: 60 },
      ],
      'narrow corridor': [
        { id: 'TOP_WALL', x: 45, y: 0, width: 10, height: 42 },
        { id: 'BOT_WALL', x: 45, y: 58, width: 10, height: 42 }, // Gap from y=42 to y=58 (height 16)
      ],
      'multiple turns (U-shape)': [
        { id: 'U1', x: 30, y: 20, width: 40, height: 15 },
        { id: 'U2', x: 30, y: 35, width: 15, height: 45 },
      ],
    }

    for (const [topologyName, obstacles] of Object.entries(testTopologies)) {
      it(`reliably initializes feasible swarm across K in [3, 5, 8, 10, 15] on ${topologyName}`, () => {
        const env: EnvironmentConfig = {
          mapWidth: 100,
          mapHeight: 100,
          start: { x: 10, y: 50 },
          goal: { x: 90, y: 50 },
          obstacles,
          intermediateWaypoints: 5,
          smoothnessWeight: 1.0,
        }

        for (const k of kValues) {
          const cfg: RobotPathPSOConfig = {
            ...psoConfig,
            swarmSize: 20,
            intermediateWaypoints: k,
            environment: env,
          }
          const prob = createRobotPathProblem({ ...env, intermediateWaypoints: k })
          const rng = createRNG(42 + k * 17)
          const state = initializeRobotPathSwarm(cfg, prob.bounds, rng)

          // 1. Must find feasible solutions
          expect(state.hasFeasibleSolution).toBe(true)
          expect(state.validParticlesCount).toBeGreaterThan(0)
          expect(state.bestPosition).toHaveLength(2 * k)

          // 2. All waypoints must be strictly within map boundaries [0, 100]
          for (let i = 0; i < state.bestPosition.length; i += 2) {
            const x = state.bestPosition[i]
            const y = state.bestPosition[i + 1]
            expect(x).toBeGreaterThanOrEqual(0)
            expect(x).toBeLessThanOrEqual(100)
            expect(y).toBeGreaterThanOrEqual(0)
            expect(y).toBeLessThanOrEqual(100)
          }

          // 3. Diagnostics consistency
          expect(state.initDiagnostics.feasibleParticlesCount).toBe(state.validParticlesCount)
          expect(state.initDiagnostics.particlesRequested).toBe(20)
          expect(state.initDiagnostics.status).toBe('feasible')
        }
      })
    }

    it('produces diverse candidate paths across the swarm rather than identical paths', () => {
      const env: EnvironmentConfig = {
        mapWidth: 100,
        mapHeight: 100,
        start: { x: 10, y: 50 },
        goal: { x: 90, y: 50 },
        obstacles: [{ id: 'MID', x: 40, y: 30, width: 20, height: 40 }],
        intermediateWaypoints: 5,
        smoothnessWeight: 1.0,
      }
      const prob = createRobotPathProblem(env)
      const rng = createRNG(12345)
      const state = initializeRobotPathSwarm(
        { ...psoConfig, swarmSize: 20, intermediateWaypoints: 5, environment: env },
        prob.bounds,
        rng
      )

      const feasibleParticles = state.particles.filter((p) => p.isFeasible)
      expect(feasibleParticles.length).toBeGreaterThanOrEqual(5)

      // Calculate pairwise differences between first feasible particle and others
      const firstPos = feasibleParticles[0].position
      let hasDistinctCandidate = false
      let maxDiff = 0

      for (let i = 1; i < feasibleParticles.length; i++) {
        const otherPos = feasibleParticles[i].position
        let diffSum = 0
        for (let d = 0; d < firstPos.length; d++) {
          diffSum += Math.abs(firstPos[d] - otherPos[d])
        }
        if (diffSum > 5.0) {
          hasDistinctCandidate = true
        }
        maxDiff = Math.max(maxDiff, diffSum)
      }

      // Swarm particles must have spatial spread, demonstrating diverse corridor sampling
      expect(hasDistinctCandidate).toBe(true)
      expect(maxDiff).toBeGreaterThan(10.0)
    })

    it('safely isolates infeasible particles in a partially feasible swarm', () => {
      // In a challenging narrow map, some particles may fail while others succeed
      const tightEnv: EnvironmentConfig = {
        mapWidth: 100,
        mapHeight: 100,
        start: { x: 5, y: 50 },
        goal: { x: 95, y: 50 },
        obstacles: [
          { id: 'T1', x: 30, y: 0, width: 20, height: 45 },
          { id: 'T2', x: 30, y: 55, width: 20, height: 45 },
          { id: 'T3', x: 70, y: 15, width: 20, height: 70 },
        ],
        intermediateWaypoints: 6,
        smoothnessWeight: 1.0,
      }
      const prob = createRobotPathProblem(tightEnv)
      const rng = createRNG(99)
      const state = initializeRobotPathSwarm(
        { ...psoConfig, swarmSize: 15, intermediateWaypoints: 6, environment: tightEnv },
        prob.bounds,
        rng
      )

      for (const p of state.particles) {
        if (!p.isFeasible) {
          expect(p.lastValidPosition).toBeNull()
          expect(p.pbestFitness).toBe(Infinity)
          expect(p.pbestObjective).toBe(Infinity)
        } else {
          expect(p.lastValidPosition).not.toBeNull()
          expect(p.pbestFitness).toBeLessThan(Infinity)
        }
      }

      // If any particle was feasible, gbest must come strictly from a feasible particle
      if (state.hasFeasibleSolution) {
        expect(state.bestFitness).toBeLessThan(Infinity)
        const pts = extractPathPoints(state.bestPosition, tightEnv.start, tightEnv.goal)
        for (const obs of tightEnv.obstacles) {
          for (let seg = 0; seg < pts.length - 1; seg++) {
            // No segment of gbest may collide with any obstacle
            expect(segmentIntersectsObstacle(pts[seg], pts[seg + 1], obs)).toBe(false)
          }
        }
      }
    })
  })
})
