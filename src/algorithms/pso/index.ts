import type { AlgorithmFactory } from '../types'
import { defaultPSOConfig, psoParameterSchema } from './defaults'
import { initializeSwarm, stepSwarm } from './engine'
import type { PSOConfig, PSOState } from './types'

export * from './types'
export * from './defaults'
export * from './engine'

export const psoFactory: AlgorithmFactory<PSOState, PSOConfig> = {
  id: 'pso',
  name: 'Particle Swarm Optimization',
  description:
    'A population-based metaheuristic inspired by the collective movement and flocking behaviors of birds or fish.',
  createInitialState: initializeSwarm,
  step: stepSwarm,
  getDefaultConfig: () => ({ ...defaultPSOConfig }),
  getConfigSchema: () => psoParameterSchema,
}
