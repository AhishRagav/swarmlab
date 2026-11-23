import { describe, it, expect } from 'vitest'
import {
  AlgorithmRegistry,
  ProblemRegistry,
  algorithmRegistry,
  problemRegistry,
  visualizationRegistry,
} from '@/registries'
import { psoFactory, defaultPSOConfig } from '@/algorithms/pso'

describe('Phase 7 Registries', () => {
  describe('Algorithm Registry', () => {
    it('pre-registers PSO algorithm with factory and default configuration', () => {
      expect(algorithmRegistry.has('pso')).toBe(true)
      const pso = algorithmRegistry.get('pso')
      expect(pso).toBeDefined()
      expect(pso?.name).toBe('Particle Swarm Optimization')
      expect(pso?.category).toBe('swarm-intelligence')
      expect(pso?.factory).toBe(psoFactory)
      expect(pso?.defaultConfig).toEqual(defaultPSOConfig)
    })

    it('retrieves all registered algorithms', () => {
      const all = algorithmRegistry.getAll()
      expect(all.length).toBeGreaterThanOrEqual(1)
      expect(all.some((a) => a.id === 'pso')).toBe(true)
    })

    it('throws error when querying non-existent algorithm with getOrThrow', () => {
      expect(() => algorithmRegistry.getOrThrow('non-existent-algo')).toThrow(
        'Algorithm "non-existent-algo" not found in algorithm registry.'
      )
    })

    it('allows registering custom algorithm and rejects duplicates or empty IDs', () => {
      const customRegistry = new AlgorithmRegistry()
      customRegistry.register({
        id: 'test-algo',
        name: 'Test Algorithm',
        description: 'Test description',
        category: 'other',
        factory: psoFactory,
        defaultConfig: defaultPSOConfig,
      })

      expect(customRegistry.has('test-algo')).toBe(true)
      expect(customRegistry.get('test-algo')?.name).toBe('Test Algorithm')

      // Reject duplicate ID
      expect(() =>
        customRegistry.register({
          id: 'test-algo',
          name: 'Duplicate',
          description: 'Dup',
          category: 'other',
          factory: psoFactory,
          defaultConfig: defaultPSOConfig,
        })
      ).toThrow('Algorithm with ID "test-algo" is already registered.')

      // Reject empty ID
      expect(() =>
        customRegistry.register({
          id: '',
          name: 'Empty ID',
          description: 'Empty',
          category: 'other',
          factory: psoFactory,
          defaultConfig: defaultPSOConfig,
        })
      ).toThrow('Algorithm ID cannot be empty.')
    })
  })

  describe('Problem Registry', () => {
    it('pre-registers built-in problems: function-optimizer and warehouse-optimizer', () => {
      expect(problemRegistry.has('function-optimizer')).toBe(true)
      expect(problemRegistry.has('warehouse-optimizer')).toBe(true)

      const fnOpt = problemRegistry.getOrThrow('function-optimizer')
      expect(fnOpt.name).toBe('Mathematical Function Optimizer')
      expect(fnOpt.category).toBe('continuous-function')
      expect(fnOpt.route).toBe('/function-optimizer')

      const whOpt = problemRegistry.getOrThrow('warehouse-optimizer')
      expect(whOpt.name).toBe('Warehouse Placement Optimizer')
      expect(whOpt.category).toBe('facility-location')
      expect(whOpt.route).toBe('/warehouse')
    })

    it('invokes createProblem factory method from problem registry', () => {
      const fnOpt = problemRegistry.getOrThrow('function-optimizer')
      expect(fnOpt.createProblem).toBeDefined()

      const problem = fnOpt.createProblem!({
        mode: 'predefined',
        functionId: 'sphere',
        dimensions: 2,
        bounds: [
          [-5, 5],
          [-5, 5],
        ],
        objective: 'minimize',
      })

      expect(problem.dimensions).toBe(2)
      expect(problem.evaluate([0, 0])).toBe(0)
    })

    it('handles duplicate and invalid problem registrations safely', () => {
      const reg = new ProblemRegistry()
      reg.register({
        id: 'p1',
        name: 'Problem 1',
        description: 'Desc',
        category: 'other',
        route: '/p1',
      })

      expect(() =>
        reg.register({
          id: 'p1',
          name: 'Problem 1 dup',
          description: 'Desc',
          category: 'other',
          route: '/p1',
        })
      ).toThrow('Problem with ID "p1" is already registered.')

      expect(() =>
        reg.register({
          id: '   ',
          name: 'Problem empty',
          description: 'Desc',
          category: 'other',
          route: '/empty',
        })
      ).toThrow('Problem ID cannot be empty.')

      expect(() => reg.getOrThrow('missing')).toThrow('Problem "missing" not found in problem registry.')
    })
  })

  describe('Visualization Registry', () => {
    it('maps visualizations to problems correctly', () => {
      const fnVisualizations = visualizationRegistry.getForProblem('function-optimizer')
      expect(fnVisualizations.length).toBe(5)
      expect(fnVisualizations.map((v) => v.id)).toContain('curve-1d')
      expect(fnVisualizations.map((v) => v.id)).toContain('contour-2d')
      expect(fnVisualizations.map((v) => v.id)).toContain('surface-3d')
      expect(fnVisualizations.map((v) => v.id)).toContain('projection-nd')
      expect(fnVisualizations.map((v) => v.id)).toContain('convergence-chart-function')

      const whVisualizations = visualizationRegistry.getForProblem('warehouse-optimizer')
      expect(whVisualizations.length).toBe(2)
      expect(whVisualizations.map((v) => v.id)).toContain('warehouse-canvas-2d')
      expect(whVisualizations.map((v) => v.id)).toContain('convergence-chart-warehouse')
    })

    it('evaluates dimension constraints properly for dimension-adaptive visualizations', () => {
      const curve1d = visualizationRegistry.get('curve-1d')!
      const contour2d = visualizationRegistry.get('contour-2d')!
      const surface3d = visualizationRegistry.get('surface-3d')!
      const projectionNd = visualizationRegistry.get('projection-nd')!

      expect(curve1d.dimensionConstraint!(1)).toBe(true)
      expect(curve1d.dimensionConstraint!(2)).toBe(false)

      expect(contour2d.dimensionConstraint!(2)).toBe(true)
      expect(contour2d.dimensionConstraint!(3)).toBe(false)

      expect(surface3d.dimensionConstraint!(3)).toBe(true)
      expect(surface3d.dimensionConstraint!(4)).toBe(false)

      expect(projectionNd.dimensionConstraint!(4)).toBe(true)
      expect(projectionNd.dimensionConstraint!(10)).toBe(true)
      expect(projectionNd.dimensionConstraint!(2)).toBe(false)
    })
  })
})
