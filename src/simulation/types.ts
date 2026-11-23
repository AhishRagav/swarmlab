import type { AlgorithmState } from '@/algorithms/types'
import type { ProblemDefinition } from '@/problems/types'

export type SimulationStatus = 'idle' | 'running' | 'paused'

export interface ConvergencePoint {
  iteration: number
  objectiveValue: number // Always the original un-negated objective value
}

export interface SimulationSnapshot<TState extends AlgorithmState> {
  status: SimulationStatus
  iteration: number
  algorithmState: TState
  convergenceHistory: ConvergencePoint[]
  maxIterations: number
  problemDefinition: ProblemDefinition
}

export interface SimulationOptions {
  maxIterations: number
  seed?: number
}
