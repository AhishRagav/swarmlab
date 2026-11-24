import type { VisualizationRegistration } from './types'

export class VisualizationRegistry {
  private registry = new Map<string, VisualizationRegistration>()

  register(entry: VisualizationRegistration): void {
    if (!entry.id || entry.id.trim() === '') {
      throw new Error('Visualization ID cannot be empty.')
    }
    if (this.registry.has(entry.id)) {
      throw new Error(`Visualization with ID "${entry.id}" is already registered.`)
    }
    this.registry.set(entry.id, entry)
  }

  get(id: string): VisualizationRegistration | undefined {
    return this.registry.get(id)
  }

  getOrThrow(id: string): VisualizationRegistration {
    const entry = this.get(id)
    if (!entry) {
      throw new Error(`Visualization "${id}" not found in visualization registry.`)
    }
    return entry
  }

  getAll(): VisualizationRegistration[] {
    return Array.from(this.registry.values())
  }

  getForProblem(problemId: string): VisualizationRegistration[] {
    return Array.from(this.registry.values()).filter((v) => v.problemId === problemId)
  }

  has(id: string): boolean {
    return this.registry.has(id)
  }

  clear(): void {
    this.registry.clear()
  }
}

// Global singleton instance
export const visualizationRegistry = new VisualizationRegistry()

// Register Function Optimizer Visualizations
visualizationRegistry.register({
  id: 'curve-1d',
  name: '1D Objective Function Curve',
  description: '1D continuous curve sampling with overlaid particle positions and global best.',
  problemId: 'function-optimizer',
  type: '1d-curve',
  dimensionConstraint: (dims) => dims === 1,
})

visualizationRegistry.register({
  id: 'contour-2d',
  name: '2D Objective Contour Map',
  description: '2D contour and heatmap landscape with live swarm coordinates.',
  problemId: 'function-optimizer',
  type: '2d-contour',
  dimensionConstraint: (dims) => dims === 2,
})

visualizationRegistry.register({
  id: 'surface-3d',
  name: '3D Spatial Scatter Distribution',
  description: 'Interactive 3D scatter plot of particles colored by objective value.',
  problemId: 'function-optimizer',
  type: '3d-surface',
  dimensionConstraint: (dims) => dims === 3,
})

visualizationRegistry.register({
  id: 'projection-nd',
  name: 'Multi-Dimensional Slice Projection',
  description: 'Interactive 2D projection on any two user-selected dimensions with others fixed at gbest.',
  problemId: 'function-optimizer',
  type: 'nd-projection',
  dimensionConstraint: (dims) => dims >= 4,
})

visualizationRegistry.register({
  id: 'convergence-chart-function',
  name: 'Convergence History Line Chart',
  description: 'Recharts line chart tracking global best objective value across iterations.',
  problemId: 'function-optimizer',
  type: 'chart',
})

// Register Warehouse Visualizations
visualizationRegistry.register({
  id: 'warehouse-canvas-2d',
  name: 'Interactive 2D Spatial Canvas Map',
  description:
    'HTML Canvas rendering of customer nodes, warehouse locations, and demand-weighted nearest assignments.',
  problemId: 'warehouse-optimizer',
  type: 'canvas-2d',
})

visualizationRegistry.register({
  id: 'convergence-chart-warehouse',
  name: 'Warehouse Cost Convergence Chart',
  description: 'Tracks reduction in demand-weighted transport distance over simulation iterations.',
  problemId: 'warehouse-optimizer',
  type: 'chart',
})

// Register Robot Path Visualizations
visualizationRegistry.register({
  id: 'robot-path-canvas-2d',
  name: 'Interactive 2D Path Planning Canvas',
  description:
    'HTML Canvas rendering of 2D map, obstacles, start/goal markers, candidate trajectories, and global best path.',
  problemId: 'robot-path-optimizer',
  type: 'canvas-2d',
})

visualizationRegistry.register({
  id: 'convergence-chart-robot-path',
  name: 'Robot Path Fitness Convergence Chart',
  description: 'Tracks minimization of collision-free path fitness across simulation iterations.',
  problemId: 'robot-path-optimizer',
  type: 'chart',
})
