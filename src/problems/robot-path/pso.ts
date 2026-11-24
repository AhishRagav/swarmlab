import type { AlgorithmFactory, ParameterSchema } from '@/algorithms/types'
import type { RNG } from '@/lib/rng'
import { extractPathPoints } from './geometry'
import { validatePath } from './collision'
import { calculateRobotPathFitness } from './fitness'
import type { EnvironmentConfig, InitializationDiagnostics, Point2D } from './types'
import { DEFAULT_ENVIRONMENT_CONFIG } from './problem'

export interface RobotPathParticle {
  position: number[]
  velocity: number[]
  lastValidPosition: number[] | null
  isFeasible: boolean
  pbestPosition: number[]
  pbestFitness: number
  pbestObjective: number
  pbestLength: number
  pbestSmoothness: number
  currentFitness?: number
  currentObjective?: number
  currentLength?: number
  currentSmoothness?: number
}

export interface RobotPathPSOConfig {
  swarmSize: number
  w: number
  c1: number
  c2: number
  intermediateWaypoints: number
  smoothnessWeight: number
  velocityClampRatio?: number
  initialVelocityMode?: 'zero' | 'random'
  inertiaMode?: 'fixed' | 'linear-decrease'
  environment: EnvironmentConfig
}

export interface RobotPathPSOState {
  particles: RobotPathParticle[]
  bestPosition: number[]
  bestFitness: number
  bestObjective: number
  bestLength: number
  bestSmoothness: number
  hasFeasibleSolution: boolean
  validParticlesCount: number
  rejectedCandidatesCount: number
  recoveryAttemptsCount: number
  successfulRecoveriesCount: number
  initializationFeasible: boolean
  initDiagnostics: InitializationDiagnostics
  gbestPosition: number[]
  gbestFitness: number
  gbestObjective: number
}

const RECOVERY_FACTORS = [0.5, 0.25, 0.125]
const MAX_INIT_ATTEMPTS_PER_PARTICLE = 100

/**
 * Generates an initial candidate position vector for K intermediate waypoints.
 * Uses interpolated baseline with smooth harmonic lateral detours (perpendicular normal profiles)
 * and multi-scale perturbations to guarantee that increasing K samples smoother curves
 * rather than high-frequency zigzags.
 */
function sampleCandidatePosition(
  k: number,
  start: Point2D,
  goal: Point2D,
  mapWidth: number,
  mapHeight: number,
  rng: RNG,
  particleIndex: number,
  attemptIndex: number
): number[] {
  const position = new Array<number>(k * 2)

  const dx = goal.x - start.x
  const dy = goal.y - start.y
  const lineDist = Math.hypot(dx, dy)

  // Unit normal vector perpendicular to the start-goal line
  let nx = 0
  let ny = 0
  if (lineDist > 1e-6) {
    nx = -dy / lineDist
    ny = dx / lineDist
  }

  // Attempt 0 for Particle 0: Straight baseline interpolation
  if (particleIndex === 0 && attemptIndex === 0) {
    for (let i = 0; i < k; i++) {
      const t = (i + 1) / (k + 1)
      position[2 * i] = Math.max(0, Math.min(mapWidth, start.x + t * dx))
      position[2 * i + 1] = Math.max(0, Math.min(mapHeight, start.y + t * dy))
    }
    return position
  }

  const mapScale = Math.min(mapWidth, mapHeight)

  if (attemptIndex < 50) {
    // Strategy 1: Smooth Harmonic Lateral Detours (sinusoidal arcs)
    // Coherent continuous deformation prevents sawtooth zigzagging as K increases.
    const sign = (particleIndex + attemptIndex) % 2 === 0 ? 1 : -1
    const tier = (particleIndex + attemptIndex * 3) % 4

    let baseAmp: number
    if (tier === 0) {
      // Gentle deviation near baseline
      baseAmp = (0.05 + rng.random() * 0.15) * mapScale
    } else if (tier === 1) {
      // Moderate lateral corridor
      baseAmp = (0.15 + rng.random() * 0.3) * mapScale
    } else if (tier === 2) {
      // Wide lateral corridor
      baseAmp = (0.3 + rng.random() * 0.45) * mapScale
    } else {
      // S-curve corridor for navigating between staggered obstacles
      baseAmp = (0.2 + rng.random() * 0.35) * mapScale
    }

    const ampA = sign * baseAmp
    const ampB =
      tier === 3
        ? -sign * (0.15 + rng.random() * 0.25) * mapScale
        : (rng.random() * 2 - 1) * 0.1 * mapScale

    // Small local jitter per waypoint ensures individual swarm particle diversity
    const jitterScale = (0.01 + rng.random() * 0.03) * mapScale

    for (let i = 0; i < k; i++) {
      const t = (i + 1) / (k + 1)
      const harmonicOffset = ampA * Math.sin(Math.PI * t) + ampB * Math.sin(2 * Math.PI * t)

      const jitterX = (rng.random() * 2 - 1) * jitterScale
      const jitterY = (rng.random() * 2 - 1) * jitterScale

      const x = start.x + t * dx + harmonicOffset * nx + jitterX
      const y = start.y + t * dy + harmonicOffset * ny + jitterY

      position[2 * i] = Math.max(0, Math.min(mapWidth, x))
      position[2 * i + 1] = Math.max(0, Math.min(mapHeight, y))
    }
  } else if (attemptIndex < 80) {
    // Strategy 2: Piecewise-linear Via-Point Routing around large obstacle blocks
    const vx = 10 + rng.random() * (mapWidth - 20)
    const vy = 10 + rng.random() * (mapHeight - 20)

    for (let i = 0; i < k; i++) {
      const t = (i + 1) / (k + 1)
      let x: number
      let y: number
      if (t < 0.5) {
        const segT = t / 0.5
        x = start.x + segT * (vx - start.x)
        y = start.y + segT * (vy - start.y)
      } else {
        const segT = (t - 0.5) / 0.5
        x = vx + segT * (goal.x - vx)
        y = vy + segT * (goal.y - vy)
      }
      const jitter = (rng.random() * 2 - 1) * 2.5
      position[2 * i] = Math.max(0, Math.min(mapWidth, x + jitter))
      position[2 * i + 1] = Math.max(0, Math.min(mapHeight, y + jitter))
    }
  } else {
    // Strategy 3: Two-Via-Points corridor routing for maze-like geometries
    const v1x = 10 + rng.random() * (mapWidth - 20)
    const v1y = 10 + rng.random() * (mapHeight - 20)
    const v2x = 10 + rng.random() * (mapWidth - 20)
    const v2y = 10 + rng.random() * (mapHeight - 20)

    for (let i = 0; i < k; i++) {
      const t = (i + 1) / (k + 1)
      let x: number
      let y: number
      if (t < 0.33) {
        const segT = t / 0.33
        x = start.x + segT * (v1x - start.x)
        y = start.y + segT * (v1y - start.y)
      } else if (t < 0.67) {
        const segT = (t - 0.33) / 0.34
        x = v1x + segT * (v2x - v1x)
        y = v1y + segT * (v2y - v1y)
      } else {
        const segT = (t - 0.67) / 0.33
        x = v2x + segT * (goal.x - v2x)
        y = v2y + segT * (goal.y - v2y)
      }
      position[2 * i] = Math.max(0, Math.min(mapWidth, x))
      position[2 * i + 1] = Math.max(0, Math.min(mapHeight, y))
    }
  }

  return position
}

/**
 * Initializes the robot path swarm with strict initial feasibility verification.
 * Discards colliding candidates during initialization up to MAX_INIT_ATTEMPTS.
 */
export function initializeRobotPathSwarm(
  config: RobotPathPSOConfig,
  bounds: [number, number][],
  rng: RNG
): RobotPathPSOState {
  const { environment, swarmSize, intermediateWaypoints } = config
  const k = intermediateWaypoints
  const dimensions = bounds.length
  const initialVelocityMode = config.initialVelocityMode ?? 'zero'

  const particles: RobotPathParticle[] = []
  let bestPosition: number[] = []
  let bestFitness = Infinity
  let bestObjective = Infinity
  let bestLength = Infinity
  let bestSmoothness = Infinity
  let hasFeasibleSolution = false
  let validParticlesCount = 0
  let initTotalAttempts = 0
  let initRejectedCount = 0

  for (let i = 0; i < swarmSize; i++) {
    let candidatePos: number[] | null = null
    let candidateMetrics = { length: Infinity, smoothness: Infinity, fitness: Infinity }
    let isFeasible = false

    // Try finding a collision-free initial path for this particle
    for (let attempt = 0; attempt < MAX_INIT_ATTEMPTS_PER_PARTICLE; attempt++) {
      initTotalAttempts++
      const pos = sampleCandidatePosition(
        k,
        environment.start,
        environment.goal,
        environment.mapWidth,
        environment.mapHeight,
        rng,
        i,
        attempt
      )

      const points = extractPathPoints(pos, environment.start, environment.goal)
      const val = validatePath(points, environment.obstacles, environment.mapWidth, environment.mapHeight)

      if (val.isValid) {
        candidatePos = pos
        candidateMetrics = calculateRobotPathFitness(points, config.smoothnessWeight)
        isFeasible = true
        break
      } else {
        initRejectedCount++
      }
    }

    // Velocity initialization
    const velocity = new Array<number>(dimensions)
    for (let d = 0; d < dimensions; d++) {
      const [min, max] = bounds[d]
      const span = max - min
      if (initialVelocityMode === 'zero') {
        velocity[d] = 0
      } else {
        velocity[d] = (rng.random() * 2 - 1) * span * 0.1
      }
    }

    if (isFeasible && candidatePos) {
      validParticlesCount++
      const particle: RobotPathParticle = {
        position: candidatePos,
        velocity,
        lastValidPosition: candidatePos.slice(),
        isFeasible: true,
        pbestPosition: candidatePos.slice(),
        pbestFitness: candidateMetrics.fitness,
        pbestObjective: candidateMetrics.fitness,
        pbestLength: candidateMetrics.length,
        pbestSmoothness: candidateMetrics.smoothness,
        currentFitness: candidateMetrics.fitness,
        currentObjective: candidateMetrics.fitness,
        currentLength: candidateMetrics.length,
        currentSmoothness: candidateMetrics.smoothness,
      }
      particles.push(particle)

      if (candidateMetrics.fitness < bestFitness) {
        bestFitness = candidateMetrics.fitness
        bestObjective = candidateMetrics.fitness
        bestLength = candidateMetrics.length
        bestSmoothness = candidateMetrics.smoothness
        bestPosition = candidatePos.slice()
        hasFeasibleSolution = true
      }
    } else {
      // Infeasible initialization for this particle
      const fallbackPos = sampleCandidatePosition(
        k,
        environment.start,
        environment.goal,
        environment.mapWidth,
        environment.mapHeight,
        rng,
        i,
        99
      )
      particles.push({
        position: fallbackPos,
        velocity,
        lastValidPosition: null,
        isFeasible: false,
        pbestPosition: fallbackPos.slice(),
        pbestFitness: Infinity,
        pbestObjective: Infinity,
        pbestLength: Infinity,
        pbestSmoothness: Infinity,
        currentFitness: Infinity,
        currentObjective: Infinity,
        currentLength: Infinity,
        currentSmoothness: Infinity,
      })
    }
  }

  const initDiagnostics: InitializationDiagnostics = {
    particlesRequested: swarmSize,
    feasibleParticlesCount: validParticlesCount,
    rejectedCandidatesCount: initRejectedCount,
    totalAttempts: initTotalAttempts,
    status: hasFeasibleSolution ? 'feasible' : 'infeasible',
  }

  return {
    particles,
    bestPosition: hasFeasibleSolution ? bestPosition : [],
    bestFitness: hasFeasibleSolution ? bestFitness : Infinity,
    bestObjective: hasFeasibleSolution ? bestObjective : Infinity,
    bestLength: hasFeasibleSolution ? bestLength : Infinity,
    bestSmoothness: hasFeasibleSolution ? bestSmoothness : Infinity,
    hasFeasibleSolution,
    validParticlesCount,
    rejectedCandidatesCount: 0,
    recoveryAttemptsCount: 0,
    successfulRecoveriesCount: 0,
    initializationFeasible: hasFeasibleSolution,
    initDiagnostics,
    gbestPosition: hasFeasibleSolution ? bestPosition.slice() : [],
    gbestFitness: hasFeasibleSolution ? bestFitness : Infinity,
    gbestObjective: hasFeasibleSolution ? bestObjective : Infinity,
  }
}

/**
 * Steps the robot path swarm forward with strict feasibility validation,
 * early exit on collision, and bounded recovery.
 */
export function stepRobotPathSwarm(
  state: RobotPathPSOState,
  config: RobotPathPSOConfig,
  bounds: [number, number][],
  rng: RNG,
  iteration?: number,
  maxIterations?: number
): RobotPathPSOState {
  const { environment, c1, c2 } = config
  const dimensions = bounds.length

  // Calculate inertia weight
  let effectiveW = config.w
  if (
    config.inertiaMode === 'linear-decrease' &&
    iteration !== undefined &&
    maxIterations !== undefined &&
    maxIterations > 0
  ) {
    const progress = maxIterations > 1 ? Math.min(1, Math.max(0, iteration / (maxIterations - 1))) : 0
    effectiveW = 0.9 - 0.5 * progress
  }

  const clampRatio = config.velocityClampRatio ?? 0.2

  let gbestPosition = state.bestPosition.slice()
  let gbestFitness = state.bestFitness
  let gbestObjective = state.bestObjective
  let gbestLength = state.bestLength
  let gbestSmoothness = state.bestSmoothness
  let hasFeasible = state.hasFeasibleSolution

  let rejectedCount = state.rejectedCandidatesCount
  let recoveryAttempts = state.recoveryAttemptsCount
  let successfulRecoveries = state.successfulRecoveriesCount
  let validCount = 0

  const newParticles = state.particles.map((p) => {
    const newPosition = new Array<number>(dimensions)
    const newVelocity = new Array<number>(dimensions)

    // Standard PSO update equations for velocity and proposed position
    for (let d = 0; d < dimensions; d++) {
      const [min, max] = bounds[d]
      const span = max - min
      const r1 = rng.random()
      const r2 = rng.random()

      // Target attractor for cognitive term (use pbest if valid, else current pos)
      const pbestTarget = p.pbestFitness < Infinity ? p.pbestPosition[d] : p.position[d]
      // Target attractor for social term (use gbest if feasible, else pbest)
      const gbestTarget = hasFeasible ? gbestPosition[d] : pbestTarget

      let v =
        effectiveW * p.velocity[d] +
        c1 * r1 * (pbestTarget - p.position[d]) +
        c2 * r2 * (gbestTarget - p.position[d])

      // Velocity clamping
      if (clampRatio > 0) {
        const vMax = clampRatio * span
        if (v > vMax) v = vMax
        else if (v < -vMax) v = -vMax
      }

      // Proposed position clipped to map boundaries
      let x = p.position[d] + v
      if (x < min) x = min
      else if (x > max) x = max

      newPosition[d] = x
      newVelocity[d] = v
    }

    // STRICT FEASIBILITY VALIDATION ON PROPOSED PATH
    const proposedPoints = extractPathPoints(newPosition, environment.start, environment.goal)
    const proposedVal = validatePath(
      proposedPoints,
      environment.obstacles,
      environment.mapWidth,
      environment.mapHeight
    )

    let finalPosition = newPosition
    let finalVelocity = newVelocity
    let isFeasible = false
    let lastValid = p.lastValidPosition

    if (proposedVal.isValid) {
      // 1. Proposed path is collision-free: accept directly
      isFeasible = true
      lastValid = newPosition.slice()
      validCount++
    } else {
      // 2. Collision detected: REJECT CANDIDATE IMMEDIATELY
      rejectedCount++

      // 3. BOUNDED RECOVERY ATTEMPT
      // If the particle has a known previous valid position, try step-halving toward it
      if (p.lastValidPosition) {
        let recovered = false

        for (const alpha of RECOVERY_FACTORS) {
          recoveryAttempts++

          const recPos = new Array<number>(dimensions)
          for (let d = 0; d < dimensions; d++) {
            recPos[d] = p.lastValidPosition[d] + alpha * (newPosition[d] - p.lastValidPosition[d])
          }

          const recPoints = extractPathPoints(recPos, environment.start, environment.goal)
          const recVal = validatePath(
            recPoints,
            environment.obstacles,
            environment.mapWidth,
            environment.mapHeight
          )

          if (recVal.isValid) {
            successfulRecoveries++
            finalPosition = recPos
            finalVelocity = newVelocity.map((v) => v * alpha) // Damp velocity
            isFeasible = true
            lastValid = recPos.slice()
            recovered = true
            validCount++
            break
          }
        }

        if (!recovered) {
          // All recovery attempts failed: retain previous valid position
          finalPosition = p.lastValidPosition.slice()
          finalVelocity = newVelocity.map((v) => v * 0.1)
          isFeasible = false
        }
      } else {
        // No previous valid position
        isFeasible = false
      }
    }

    // BEST VALUE UPDATES (ONLY FEASIBLE PATHS MAY UPDATE PBEST OR GBEST)
    let pbestPosition = p.pbestPosition
    let pbestFitness = p.pbestFitness
    let pbestObjective = p.pbestObjective
    let pbestLength = p.pbestLength
    let pbestSmoothness = p.pbestSmoothness

    let curFitness = Infinity
    let curObjective = Infinity
    let curLength = Infinity
    let curSmoothness = Infinity

    if (isFeasible) {
      const finalPoints = extractPathPoints(finalPosition, environment.start, environment.goal)
      const metrics = calculateRobotPathFitness(finalPoints, config.smoothnessWeight)

      curFitness = metrics.fitness
      curObjective = metrics.fitness
      curLength = metrics.length
      curSmoothness = metrics.smoothness

      if (metrics.fitness < pbestFitness) {
        pbestFitness = metrics.fitness
        pbestObjective = metrics.fitness
        pbestLength = metrics.length
        pbestSmoothness = metrics.smoothness
        pbestPosition = finalPosition.slice()
      }

      if (pbestFitness < gbestFitness) {
        gbestFitness = pbestFitness
        gbestObjective = pbestObjective
        gbestLength = pbestLength
        gbestSmoothness = pbestSmoothness
        gbestPosition = pbestPosition.slice()
        hasFeasible = true
      }
    }

    return {
      position: finalPosition,
      velocity: finalVelocity,
      lastValidPosition: lastValid,
      isFeasible,
      pbestPosition,
      pbestFitness,
      pbestObjective,
      pbestLength,
      pbestSmoothness,
      currentFitness: curFitness,
      currentObjective: curObjective,
      currentLength: curLength,
      currentSmoothness: curSmoothness,
    }
  })

  return {
    particles: newParticles,
    bestPosition: hasFeasible ? gbestPosition : [],
    bestFitness: hasFeasible ? gbestFitness : Infinity,
    bestObjective: hasFeasible ? gbestObjective : Infinity,
    bestLength: hasFeasible ? gbestLength : Infinity,
    bestSmoothness: hasFeasible ? gbestSmoothness : Infinity,
    hasFeasibleSolution: hasFeasible,
    validParticlesCount: validCount,
    rejectedCandidatesCount: rejectedCount,
    recoveryAttemptsCount: recoveryAttempts,
    successfulRecoveriesCount: successfulRecoveries,
    initializationFeasible: state.initializationFeasible,
    initDiagnostics: state.initDiagnostics,
    gbestPosition: hasFeasible ? gbestPosition.slice() : [],
    gbestFitness: hasFeasible ? gbestFitness : Infinity,
    gbestObjective: hasFeasible ? gbestObjective : Infinity,
  }
}

/**
 * AlgorithmFactory for Robot Path Planning with PSO.
 * Plugs directly into SwarmLab's SimulationController and SimulationStore.
 */
export const robotPathPSOFactory: AlgorithmFactory<RobotPathPSOState, RobotPathPSOConfig> = {
  id: 'robot-path-pso',
  name: 'Robot Path PSO',
  description:
    'Particle Swarm Optimization for 2D robot path planning with strict collision rejection and bounded recovery.',

  createInitialState(config, bounds, _evaluateFn, rng) {
    return initializeRobotPathSwarm(config, bounds, rng)
  },

  step(state, config, bounds, _evaluateFn, rng, iteration, maxIterations) {
    return stepRobotPathSwarm(state, config, bounds, rng, iteration, maxIterations)
  },

  getDefaultConfig(): RobotPathPSOConfig {
    return {
      swarmSize: 30,
      w: 0.7,
      c1: 1.5,
      c2: 1.5,
      intermediateWaypoints: 5,
      smoothnessWeight: 1.0,
      velocityClampRatio: 0.2,
      initialVelocityMode: 'zero',
      inertiaMode: 'fixed',
      environment: DEFAULT_ENVIRONMENT_CONFIG,
    }
  },

  getConfigSchema(): ParameterSchema[] {
    return [
      {
        name: 'swarmSize',
        label: 'Swarm Size',
        type: 'number',
        default: 30,
        min: 5,
        max: 100,
        step: 1,
        description: 'Number of candidate robot path particles in the swarm.',
      },
      {
        name: 'intermediateWaypoints',
        label: 'Waypoints',
        type: 'number',
        default: 5,
        min: 1,
        max: 20,
        step: 1,
        description: 'Number of intermediate waypoints to optimize between Start and Goal.',
      },
      {
        name: 'smoothnessWeight',
        label: 'Smoothness Weight (λ)',
        type: 'number',
        default: 1.0,
        min: 0,
        max: 10,
        step: 0.1,
        description: 'Weight of turning angle penalty in fitness function.',
      },
      {
        name: 'w',
        label: 'Inertia Weight (w)',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 1.5,
        step: 0.05,
      },
      {
        name: 'c1',
        label: 'Cognitive Coefficient (c1)',
        type: 'number',
        default: 1.5,
        min: 0,
        max: 3,
        step: 0.1,
      },
      {
        name: 'c2',
        label: 'Social Coefficient (c2)',
        type: 'number',
        default: 1.5,
        min: 0,
        max: 3,
        step: 0.1,
      },
    ]
  },
}
