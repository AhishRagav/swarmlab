import type { RNG } from '@/lib/rng'

/**
 * Minimal shared state contract for any optimization algorithm.
 * Algorithms can add their own fields (e.g. particles, population, velocities).
 */
export interface AlgorithmState {
  bestPosition: number[]
  bestFitness: number // Internal value (always minimized; used for comparisons)
  bestObjective: number // Original problem objective value (for UI display)
}

/**
 * Marker interface for algorithm configuration.
 * Problem-level data (bounds) and controller-level data (maxIterations, seed)
 * are injected separately by the simulation controller.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AlgorithmConfig {}

export interface ParameterSchema {
  name: string
  label: string
  type: 'number' | 'select' | 'boolean'
  default: number | string | boolean
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  description?: string
}

export interface EvaluationResult {
  fitness: number // Negated if maximize, identical if minimize
  objective: number // Raw objective value (always un-negated)
}

export type EvaluateFn = (position: number[]) => EvaluationResult

export interface AlgorithmFactory<
  TState extends AlgorithmState = AlgorithmState,
  TConfig extends AlgorithmConfig = AlgorithmConfig
> {
  id: string
  name: string
  description: string
  createInitialState(
    config: TConfig,
    bounds: [number, number][],
    evaluateFn: EvaluateFn,
    rng: RNG
  ): TState
  step(
    state: TState,
    config: TConfig,
    bounds: [number, number][],
    evaluateFn: EvaluateFn,
    rng: RNG,
    iteration?: number,
    maxIterations?: number
  ): TState
  getDefaultConfig(): TConfig
  getConfigSchema(): ParameterSchema[]
}
