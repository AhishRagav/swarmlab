import type { AlgorithmState } from '@/algorithms/types'
import type { ProblemDefinition } from '@/problems/types'

export type SimulationStatus = 'idle' | 'running' | 'paused'
export type SimulationAction = 'init' | 'play' | 'pause' | 'step' | 'reset' | 'complete'

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
  lastAction?: SimulationAction
  gbestImproved?: boolean
}

export interface SimulationOptions {
  maxIterations: number
  seed?: number
}
