import type { AlgorithmFactory } from './types'

export * from './types'

export const algorithmRegistry = new Map<string, AlgorithmFactory>()
