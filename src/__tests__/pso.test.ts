import { describe, it, expect } from 'vitest'
import { initializeSwarm, stepSwarm } from '@/algorithms/pso/engine'
import type { PSOConfig } from '@/algorithms/pso/types'
import { createRNG } from '@/lib/rng'

describe('PSO Engine', () => {
  const config: PSOConfig = {
    swarmSize: 20,
    w: 0.7,
    c1: 1.5,
    c2: 1.5,
    initialVelocityMode: 'zero',
    velocityClampRatio: 0.2,
    boundaryHandling: 'clipping',
    inertiaMode: 'fixed',
  }

  // Sphere function: f(x) = sum(x_i^2)
  const sphereEvaluate = (pos: number[]) => {
    const sum = pos.reduce((acc, v) => acc + v * v, 0)
    return { fitness: sum, objective: sum }
  }

  it('initializes swarm within bounds with correct swarm size and dimensions', () => {
    const bounds: [number, number][] = [
      [-5, 5],
      [-10, 10],
      [0, 1],
    ]
    const rng = createRNG(42)
    const state = initializeSwarm(config, bounds, sphereEvaluate, rng)

    expect(state.particles.length).toBe(20)
    expect(state.bestPosition.length).toBe(3)
    expect(state.bestFitness).toBeGreaterThan(0)
    expect(state.bestObjective).toBe(state.bestFitness)

    for (const p of state.particles) {
      expect(p.position.length).toBe(3)
      expect(p.velocity.length).toBe(3)
      for (let d = 0; d < 3; d++) {
        expect(p.position[d]).toBeGreaterThanOrEqual(bounds[d][0])
        expect(p.position[d]).toBeLessThanOrEqual(bounds[d][1])
      }
    }
  })

  it('supports zero velocity initialization as syllabus default', () => {
    const bounds: [number, number][] = [
      [-10, 10],
      [-5, 5],
    ]
    const rng = createRNG(1)
    const state = initializeSwarm({ ...config, initialVelocityMode: 'zero' }, bounds, sphereEvaluate, rng)

    for (const p of state.particles) {
      expect(p.velocity).toEqual([0, 0])
    }
  })

  it('supports random velocity initialization within ±10% of search range', () => {
    const bounds: [number, number][] = [
      [-10, 10], // span = 20, 10% = 2.0
      [0, 100],  // span = 100, 10% = 10.0
    ]
    const rng = createRNG(2)
    const state = initializeSwarm({ ...config, initialVelocityMode: 'random' }, bounds, sphereEvaluate, rng)

    for (const p of state.particles) {
      expect(Math.abs(p.velocity[0])).toBeLessThanOrEqual(2.0001)
      expect(Math.abs(p.velocity[1])).toBeLessThanOrEqual(10.0001)
    }
  })

  it('applies velocity clamping (Vmax = 20% of range by default)', () => {
    const bounds: [number, number][] = [[-10, 10]] // span = 20, 20% = 4.0
    // Artificial particle with very high initial velocity and attraction
    const artificialState = {
      particles: [
        {
          position: [0],
          velocity: [20.0], // Will produce high updated velocity
          pbestPosition: [10],
          pbestFitness: 100,
          pbestObjective: 100,
        },
      ],
      bestPosition: [10],
      bestFitness: 100,
      bestObjective: 100,
      gbestPosition: [10],
      gbestFitness: 100,
      gbestObjective: 100,
    }

    const rng = createRNG(1)
    const nextState = stepSwarm(
      artificialState,
      { ...config, w: 1, c1: 2, c2: 2, velocityClampRatio: 0.2 },
      bounds,
      sphereEvaluate,
      rng
    )

    // Velocity must be clamped to Vmax = 4.0
    expect(nextState.particles[0].velocity[0]).toBe(4.0)
    expect(nextState.particles[0].position[0]).toBe(4.0) // 0 + 4.0
  })

  it('applies position clipping boundary handling without altering velocity (syllabus default)', () => {
    const bounds: [number, number][] = [[-2, 2]]
    const artificialState = {
      particles: [
        {
          position: [1.8],
          velocity: [1.0], // 1.8 + 1.0 = 2.8 > upper bound 2.0
          pbestPosition: [0],
          pbestFitness: 0,
          pbestObjective: 0,
        },
      ],
      bestPosition: [0],
      bestFitness: 0,
      bestObjective: 0,
      gbestPosition: [0],
      gbestFitness: 0,
      gbestObjective: 0,
    }

    const rng = createRNG(1)
    const nextState = stepSwarm(
      artificialState,
      { ...config, w: 1, c1: 0, c2: 0, velocityClampRatio: 0.9, boundaryHandling: 'clipping' },
      bounds,
      sphereEvaluate,
      rng
    )

    const p = nextState.particles[0]
    expect(p.position[0]).toBe(2) // Position is clipped to max
    expect(p.velocity[0]).toBe(1.0) // Velocity is preserved
  })

  it('applies absorb boundary handling when selected: clamps position and sets velocity to 0', () => {
    const bounds: [number, number][] = [[-2, 2]]
    const artificialState = {
      particles: [
        {
          position: [1.8],
          velocity: [1.0],
          pbestPosition: [0],
          pbestFitness: 0,
          pbestObjective: 0,
        },
      ],
      bestPosition: [0],
      bestFitness: 0,
      bestObjective: 0,
      gbestPosition: [0],
      gbestFitness: 0,
      gbestObjective: 0,
    }

    const rng = createRNG(1)
    const nextState = stepSwarm(
      artificialState,
      { ...config, w: 1, c1: 0, c2: 0, velocityClampRatio: 0.9, boundaryHandling: 'absorb' },
      bounds,
      sphereEvaluate,
      rng
    )

    const p = nextState.particles[0]
    expect(p.position[0]).toBe(2) // Position is clamped
    expect(p.velocity[0]).toBe(0) // Absorb zeroes velocity
  })

  it('supports linearly decreasing inertia weight from exactly 0.9 to 0.4 over (maxIterations - 1)', () => {
    const bounds: [number, number][] = [[-10, 10]]
    const artificialState = {
      particles: [
        {
          position: [0],
          velocity: [1.0],
          pbestPosition: [0],
          pbestFitness: 0,
          pbestObjective: 0,
        },
      ],
      bestPosition: [0],
      bestFitness: 0,
      bestObjective: 0,
      gbestPosition: [0],
      gbestFitness: 0,
      gbestObjective: 0,
    }

    const rng = createRNG(1)
    const cfg: PSOConfig = { ...config, w: 0.5, c1: 0, c2: 0, velocityClampRatio: 1, inertiaMode: 'linear-decrease' }

    // Case 1: maxIterations = 101
    // First update (iteration = 0): w must be exactly 0.9 -> v(1) = 0.9 * 1.0 = 0.9
    const stateAt0 = stepSwarm(artificialState, cfg, bounds, sphereEvaluate, rng, 0, 101)
    expect(stateAt0.particles[0].velocity[0]).toBeCloseTo(0.9, 6)

    // Intermediate update (iteration = 50 of 100 intervals): w = 0.9 - 0.5 * 0.5 = 0.65
    const stateAt50 = stepSwarm(artificialState, cfg, bounds, sphereEvaluate, rng, 50, 101)
    expect(stateAt50.particles[0].velocity[0]).toBeCloseTo(0.65, 6)

    // Final update (iteration = maxIterations - 1 = 100): w must be exactly 0.4 -> v(1) = 0.4 * 1.0 = 0.4
    const stateAtFinal101 = stepSwarm(artificialState, cfg, bounds, sphereEvaluate, rng, 100, 101)
    expect(stateAtFinal101.particles[0].velocity[0]).toBeCloseTo(0.4, 6)

    // Case 2: maxIterations = 100 (final scheduled update is iteration 99)
    const stateAtFinal100 = stepSwarm(artificialState, cfg, bounds, sphereEvaluate, rng, 99, 100)
    expect(stateAtFinal100.particles[0].velocity[0]).toBeCloseTo(0.4, 6)

    // Case 3: maxIterations = 1 (single-iteration edge case safely handled without division by zero)
    const stateSingleIter = stepSwarm(artificialState, cfg, bounds, sphereEvaluate, rng, 0, 1)
    expect(stateSingleIter.particles[0].velocity[0]).toBeCloseTo(0.9, 6)
  })

  it('guarantees deterministic runs when provided a seed', () => {
    const bounds: [number, number][] = [
      [-5, 5],
      [-5, 5],
    ]
    const rng1 = createRNG(12345)
    const rng2 = createRNG(12345)

    const state1 = initializeSwarm(config, bounds, sphereEvaluate, rng1)
    const state2 = initializeSwarm(config, bounds, sphereEvaluate, rng2)

    expect(state1.bestPosition).toEqual(state2.bestPosition)
    expect(state1.bestFitness).toEqual(state2.bestFitness)

    const step1 = stepSwarm(state1, config, bounds, sphereEvaluate, rng1, 0, 100)
    const step2 = stepSwarm(state2, config, bounds, sphereEvaluate, rng2, 0, 100)

    expect(step1.bestPosition).toEqual(step2.bestPosition)
    expect(step1.bestFitness).toEqual(step2.bestFitness)
  })

  it('preserves immutability: stepSwarm does not mutate the prior state', () => {
    const bounds: [number, number][] = [
      [-5, 5],
      [-5, 5],
    ]
    const rng = createRNG(99)
    const initialState = initializeSwarm(config, bounds, sphereEvaluate, rng)

    const posCopy = initialState.particles.map((p) => [...p.position])
    stepSwarm(initialState, config, bounds, sphereEvaluate, rng, 0, 100)

    for (let i = 0; i < initialState.particles.length; i++) {
      expect(initialState.particles[i].position).toEqual(posCopy[i])
    }
  })

  it('optimizes Sphere function across 30 iterations', () => {
    const bounds: [number, number][] = [
      [-5, 5],
      [-5, 5],
    ]
    const rng = createRNG(42)
    let state = initializeSwarm({ ...config, swarmSize: 30 }, bounds, sphereEvaluate, rng)

    const initialBest = state.bestFitness

    for (let iter = 0; iter < 30; iter++) {
      state = stepSwarm(state, config, bounds, sphereEvaluate, rng, iter, 30)
    }

    expect(state.bestFitness).toBeLessThan(initialBest)
    expect(state.bestFitness).toBeLessThan(0.5)
  })

  it('supports high dimensions up to N=20', () => {
    const N = 20
    const bounds: [number, number][] = Array.from({ length: N }, () => [-5, 5])
    const rng = createRNG(7)
    let state = initializeSwarm({ ...config, swarmSize: 40 }, bounds, sphereEvaluate, rng)

    expect(state.bestPosition.length).toBe(20)

    for (let i = 0; i < 5; i++) {
      state = stepSwarm(state, config, bounds, sphereEvaluate, rng, i, 5)
    }

    expect(state.bestPosition.length).toBe(20)
    expect(state.particles.every((p) => p.position.length === 20)).toBe(true)
  })
})
