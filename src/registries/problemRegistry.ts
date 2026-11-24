import type { ProblemRegistration } from './types'
import { createFunctionProblem } from '@/problems/function-optimizer/problem'
import { createWarehouseProblem } from '@/problems/warehouse/problem'
import { createRobotPathProblem, DEFAULT_ENVIRONMENT_CONFIG } from '@/problems/robot-path'

export class ProblemRegistry {
  private registry = new Map<string, ProblemRegistration>()

  register(entry: ProblemRegistration): void {
    if (!entry.id || entry.id.trim() === '') {
      throw new Error('Problem ID cannot be empty.')
    }
    if (this.registry.has(entry.id)) {
      throw new Error(`Problem with ID "${entry.id}" is already registered.`)
    }
    this.registry.set(entry.id, entry)
  }

  get(id: string): ProblemRegistration | undefined {
    return this.registry.get(id)
  }

  getOrThrow(id: string): ProblemRegistration {
    const entry = this.get(id)
    if (!entry) {
      throw new Error(`Problem "${id}" not found in problem registry.`)
    }
    return entry
  }

  getAll(): ProblemRegistration[] {
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
export const problemRegistry = new ProblemRegistry()

// Register built-in problems
problemRegistry.register({
  id: 'function-optimizer',
  name: 'Mathematical Function Optimizer',
  description:
    'Finds the best value of a mathematical function while following the constraints you set.',
  category: 'continuous-function',
  route: '/function-optimizer',
  defaultDimensions: 2,
  supportedDimensions: 'any',
  createProblem: createFunctionProblem,
})

problemRegistry.register({
  id: 'warehouse-optimizer',
  name: 'Warehouse Placement Optimizer',
  description:
    'Finds the best locations for warehouses to serve customers efficiently.',
  category: 'facility-location',
  route: '/warehouse',
  defaultDimensions: 6, // 3 warehouses * 2 dimensions
  createProblem: createWarehouseProblem,
})

problemRegistry.register({
  id: 'robot-path-optimizer',
  name: 'Robot Path Planning Optimizer',
  description:
    'Finds a safe and efficient path for a robot to reach its destination while avoiding obstacles.',
  category: 'path-planning',
  route: '/robot-path',
  defaultDimensions: 10, // 5 waypoints * 2 dimensions
  createProblem: () => createRobotPathProblem(DEFAULT_ENVIRONMENT_CONFIG),
})
