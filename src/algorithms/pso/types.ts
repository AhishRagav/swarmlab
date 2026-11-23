import type { AlgorithmConfig, AlgorithmState } from '../types'

export type InitialVelocityMode = 'zero' | 'random'
export type BoundaryHandlingMode = 'clipping' | 'absorb'
export type InertiaMode = 'fixed' | 'linear-decrease'

export interface Particle {
  position: number[]
  velocity: number[]
  pbestPosition: number[]
  pbestFitness: number
  pbestObjective: number
}

export interface PSOConfig extends AlgorithmConfig {
  swarmSize: number
  w: number // Inertia weight (used in fixed mode)
  c1: number // Cognitive coefficient (personal best attraction)
  c2: number // Social coefficient (global best attraction)
  initialVelocityMode?: InitialVelocityMode // Default: 'zero' (syllabus standard)
  velocityClampRatio?: number // Default: 0.2 (20% of variable range)
  boundaryHandling?: BoundaryHandlingMode // Default: 'clipping' (position clipping)
  inertiaMode?: InertiaMode // Default: 'fixed'
}

export interface PSOState extends AlgorithmState {
  particles: Particle[]
  // Aliases referencing bestPosition, bestFitness, bestObjective for PSO-specific code
  gbestPosition: number[]
  gbestFitness: number
  gbestObjective: number
}
