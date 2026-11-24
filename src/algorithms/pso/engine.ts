import type { EvaluateFn } from '../types'
import type { RNG } from '@/lib/rng'
import type { Particle, PSOConfig, PSOState } from './types'

/**
 * Initializes a swarm in N dimensions within the provided bounds.
 * Pure function: does not mutate input parameters.
 */
export function initializeSwarm(
  config: PSOConfig,
  bounds: [number, number][],
  evaluateFn: EvaluateFn,
  rng: RNG
): PSOState {
  const dimensions = bounds.length
  if (dimensions === 0) {
    throw new Error('Bounds must specify at least 1 dimension.')
  }

  const initialVelocityMode = config.initialVelocityMode ?? 'zero'
  const particles: Particle[] = []

  let bestPosition: number[] = []
  let bestFitness = Infinity
  let bestObjective = Infinity

  for (let i = 0; i < config.swarmSize; i++) {
    const position = new Array<number>(dimensions)
    const velocity = new Array<number>(dimensions)

    for (let d = 0; d < dimensions; d++) {
      const [min, max] = bounds[d]
      const span = max - min
      position[d] = min + rng.random() * span

      if (initialVelocityMode === 'zero') {
        // Syllabus standard default: zero velocity initialization
        velocity[d] = 0
      } else {
        // Random mode: uniform within ±10% of variable's search range
        velocity[d] = (rng.random() * 2 - 1) * span * 0.1
      }
    }

    const rawEval = evaluateFn(position) as unknown
    const evalResult =
      typeof rawEval === 'number'
        ? { fitness: rawEval, objective: rawEval }
        : (rawEval as { fitness: number; objective: number })

    const particle: Particle = {
      position,
      velocity,
      pbestPosition: position.slice(),
      pbestFitness: evalResult.fitness,
      pbestObjective: evalResult.objective,
      currentFitness: evalResult.fitness,
      currentObjective: evalResult.objective,
    }

    particles.push(particle)

    if (evalResult.fitness < bestFitness) {
      bestFitness = evalResult.fitness
      bestObjective = evalResult.objective
      bestPosition = position.slice()
    }
  }

  return {
    particles,
    bestPosition,
    bestFitness,
    bestObjective,
    gbestPosition: bestPosition.slice(),
    gbestFitness: bestFitness,
    gbestObjective: bestObjective,
  }
}

/**
 * Executes a single step of Particle Swarm Optimization.
 * Follows the syllabus sequence:
 *  1. Calculate velocity with inertia (fixed or linear-decrease), cognitive, and social terms
 *  2. Apply velocity clamping (Vmax = clampRatio * range)
 *  3. Update particle position (x = x + v)
 *  4. Apply boundary handling (standard clipping or absorb)
 *  5. Evaluate new position
 *  6. Update pbest and gbest
 * Pure function: returns a new state without mutating the previous state.
 */
export function stepSwarm(
  state: PSOState,
  config: PSOConfig,
  bounds: [number, number][],
  evaluateFn: EvaluateFn,
  rng: RNG,
  iteration?: number,
  maxIterations?: number
): PSOState {
  const dimensions = bounds.length
  const { c1, c2 } = config

  // Compute effective inertia weight
  const inertiaMode = config.inertiaMode ?? 'fixed'
  let effectiveW = config.w
  if (
    inertiaMode === 'linear-decrease' &&
    iteration !== undefined &&
    maxIterations !== undefined &&
    maxIterations > 0
  ) {
    // Linearly decreases from exactly 0.9 (first update) to exactly 0.4 (final update) over (maxIterations - 1)
    const progress =
      maxIterations > 1
        ? Math.min(1, Math.max(0, iteration / (maxIterations - 1)))
        : 0
    effectiveW = 0.9 - (0.9 - 0.4) * progress
  }

  const clampRatio = config.velocityClampRatio ?? 0.2
  const boundaryMode = config.boundaryHandling ?? 'clipping'

  let gbestPosition = state.bestPosition.slice()
  let gbestFitness = state.bestFitness
  let gbestObjective = state.bestObjective

  const newParticles = state.particles.map((p) => {
    const newPosition = new Array<number>(dimensions)
    const newVelocity = new Array<number>(dimensions)

    for (let d = 0; d < dimensions; d++) {
      const [min, max] = bounds[d]
      const span = max - min
      const r1 = rng.random()
      const r2 = rng.random()

      // 1. Standard PSO velocity update equation
      let v =
        effectiveW * p.velocity[d] +
        c1 * r1 * (p.pbestPosition[d] - p.position[d]) +
        c2 * r2 * (state.bestPosition[d] - p.position[d])

      // 2. Velocity clamping: applied immediately after calculation and before position update
      if (clampRatio > 0) {
        const vMax = clampRatio * span
        if (v > vMax) {
          v = vMax
        } else if (v < -vMax) {
          v = -vMax
        }
      }

      // 3. Update position
      let x = p.position[d] + v

      // 4. Boundary handling
      if (boundaryMode === 'absorb') {
        // Absorb mode: clamps position and zeroes velocity in that dimension
        if (x < min) {
          x = min
          v = 0
        } else if (x > max) {
          x = max
          v = 0
        }
      } else {
        // Standard clipping mode (syllabus default): clamps position without altering velocity
        if (x < min) {
          x = min
        } else if (x > max) {
          x = max
        }
      }

      newPosition[d] = x
      newVelocity[d] = v
    }

    // 5. Evaluate new position
    const rawEval = evaluateFn(newPosition) as unknown
    const evalResult =
      typeof rawEval === 'number'
        ? { fitness: rawEval, objective: rawEval }
        : (rawEval as { fitness: number; objective: number })

    // 6. Update personal best (pbest)
    let pbestPosition = p.pbestPosition
    let pbestFitness = p.pbestFitness
    let pbestObjective = p.pbestObjective

    if (evalResult.fitness < p.pbestFitness) {
      pbestFitness = evalResult.fitness
      pbestObjective = evalResult.objective
      pbestPosition = newPosition.slice()
    }

    // 7. Update global best (gbest)
    if (pbestFitness < gbestFitness) {
      gbestFitness = pbestFitness
      gbestObjective = pbestObjective
      gbestPosition = pbestPosition.slice()
    }

    return {
      position: newPosition,
      velocity: newVelocity,
      pbestPosition,
      pbestFitness,
      pbestObjective,
      currentFitness: evalResult.fitness,
      currentObjective: evalResult.objective,
    }
  })

  return {
    particles: newParticles,
    bestPosition: gbestPosition,
    bestFitness: gbestFitness,
    bestObjective: gbestObjective,
    gbestPosition,
    gbestFitness,
    gbestObjective,
  }
}
