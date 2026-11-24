import type { AlgorithmFactory, AlgorithmConfig, AlgorithmState } from '@/algorithms/types'
import type { ProblemDefinition } from '@/problems/types'

export interface AlgorithmRegistration<
  TState extends AlgorithmState = AlgorithmState,
  TConfig extends AlgorithmConfig = AlgorithmConfig
> {
  id: string
  name: string
  description: string
  category: 'swarm-intelligence' | 'evolutionary' | 'physics-based' | 'other'
  factory: AlgorithmFactory<TState, TConfig>
  defaultConfig: TConfig
}

export interface ProblemRegistration {
  id: string
  name: string
  description: string
  category: 'continuous-function' | 'facility-location' | 'path-planning' | 'combinatorial' | 'other'
  route: string
  defaultDimensions?: number
  supportedDimensions?: 'any' | number[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createProblem?: (config: any) => ProblemDefinition
}

export interface VisualizationRegistration {
  id: string
  name: string
  description: string
  problemId: string
  type: '1d-curve' | '2d-contour' | '3d-surface' | 'nd-projection' | 'canvas-2d' | 'chart'
  dimensionConstraint?: (dimensions: number) => boolean
}
