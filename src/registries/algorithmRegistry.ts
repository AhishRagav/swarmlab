import type { AlgorithmRegistration } from './types'
import { psoFactory, defaultPSOConfig } from '@/algorithms/pso'
import type { PSOConfig, PSOState } from '@/algorithms/pso/types'
import { robotPathPSOFactory } from '@/problems/robot-path'

export class AlgorithmRegistry {
  private registry = new Map<string, AlgorithmRegistration>()

  register<TState extends PSOState = PSOState, TConfig extends PSOConfig = PSOConfig>(
    entry: AlgorithmRegistration<TState, TConfig>
  ): void {
    if (!entry.id || entry.id.trim() === '') {
      throw new Error('Algorithm ID cannot be empty.')
    }
    if (this.registry.has(entry.id)) {
      throw new Error(`Algorithm with ID "${entry.id}" is already registered.`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.registry.set(entry.id, entry as any)
  }

  get(id: string): AlgorithmRegistration | undefined {
    return this.registry.get(id)
  }

  getOrThrow(id: string): AlgorithmRegistration {
    const entry = this.get(id)
    if (!entry) {
      throw new Error(`Algorithm "${id}" not found in algorithm registry.`)
    }
    return entry
  }

  getAll(): AlgorithmRegistration[] {
    return Array.from(this.registry.values())
  }

  has(id: string): boolean {
    return this.registry.has(id)
  }

  clear(): void {
    this.registry.clear()
  }
}

// Global singleton instance
export const algorithmRegistry = new AlgorithmRegistry()

// Register default built-in PSO algorithm
algorithmRegistry.register({
  id: 'pso',
  name: 'Particle Swarm Optimization',
  description:
    'Syllabus-aligned Particle Swarm Optimization with configurable inertia, acceleration coefficients, velocity clamping, and boundary handling.',
  category: 'swarm-intelligence',
  factory: psoFactory,
  defaultConfig: defaultPSOConfig,
})

algorithmRegistry.register({
  id: 'robot-path-pso',
  name: 'Robot Path PSO',
  description:
    'Particle Swarm Optimization for 2D robot path planning with strict collision rejection and bounded recovery.',
  category: 'swarm-intelligence',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  factory: robotPathPSOFactory as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultConfig: robotPathPSOFactory.getDefaultConfig() as any,
})
