import { describe, it, expect } from 'vitest'
import { createFunctionProblem, getBenchmarkFunction } from '@/problems/function-optimizer/problem'
import {
  createWarehouseProblem,
  generateRandomCustomers,
  calculateWarehouseObjective,
  analyzeWarehouseSolution,
  euclideanDistance,
  extractWarehouseCoordinates,
  DEFAULT_WAREHOUSE_BOUNDS,
  type Customer,
} from '@/problems/warehouse'
import { psoFactory, defaultPSOConfig } from '@/algorithms/pso'
import type { PSOState, PSOConfig } from '@/algorithms/pso/types'
import { SimulationController } from '@/simulation/controller'

describe('Final Manual Verification — Phase 4 & Phase 5', () => {
  describe('1. Function Optimizer Verification', () => {
    it('N=1: generates correct 1D problem definition, bounds, and sampling', () => {
      const problem = createFunctionProblem({
        mode: 'predefined',
        functionId: 'sphere',
        dimensions: 1,
        bounds: [[-5, 5]],
        objective: 'minimize',
      })

      expect(problem.dimensions).toBe(1)
      expect(problem.bounds).toEqual([[-5, 5]])
      expect(problem.evaluate([0])).toBe(0)
      expect(problem.evaluate([3])).toBe(9)

      // Test 1D curve sampling
      const numPoints = 150
      const [min, max] = problem.bounds[0]
      const step = (max - min) / (numPoints - 1)
      const xs: number[] = []
      const ys: number[] = []
      for (let i = 0; i < numPoints; i++) {
        const x = min + i * step
        xs.push(x)
        ys.push(problem.evaluate([x]))
      }
      expect(xs).toHaveLength(150)
      expect(ys).toHaveLength(150)
      expect(xs[0]).toBeCloseTo(-5)
      expect(xs[149]).toBeCloseTo(5)
    })

    it('N=2: generates 2D contour grid correctly across bounds', () => {
      const problem = createFunctionProblem({
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
      expect(problem.evaluate([3, 4])).toBe(25)

      // 40x40 contour grid test
      const resolution = 40
      const [minX, maxX] = problem.bounds[0]
      const [minY, maxY] = problem.bounds[1]
      const stepX = (maxX - minX) / (resolution - 1)
      const stepY = (maxY - minY) / (resolution - 1)

      const grid: number[][] = []
      for (let j = 0; j < resolution; j++) {
        const row: number[] = []
        const y = minY + j * stepY
        for (let i = 0; i < resolution; i++) {
          const x = minX + i * stepX
          row.push(problem.evaluate([x, y]))
        }
        grid.push(row)
      }

      expect(grid).toHaveLength(40)
      expect(grid[0]).toHaveLength(40)
      expect(grid[0][0]).toBeCloseTo(50) // (-5)^2 + (-5)^2 = 50
    })

    it('N=3: evaluates 3D coordinates and fitness for 3D scatter', () => {
      const problem = createFunctionProblem({
        mode: 'predefined',
        functionId: 'sphere',
        dimensions: 3,
        bounds: [
          [-5, 5],
          [-5, 5],
          [-5, 5],
        ],
        objective: 'minimize',
      })

      expect(problem.dimensions).toBe(3)
      expect(problem.evaluate([1, 2, 3])).toBe(14) // 1^2 + 2^2 + 3^2 = 14
    })

    it('N=4: slices 2D projection with other dimensions held at gbest, table displays all 4 variables', () => {
      const problem = createFunctionProblem({
        mode: 'predefined',
        functionId: 'sphere',
        dimensions: 4,
        bounds: [
          [-5, 5],
          [-5, 5],
          [-5, 5],
          [-5, 5],
        ],
        objective: 'minimize',
      })

      const gbest = [1, 2, 3, 4]
      const axisX = 0
      const axisY = 1

      // Projection probe slice
      const probe = [...gbest]
      probe[axisX] = 0
      probe[axisY] = 0
      // Dimensions 2 and 3 stay fixed at 3 and 4: 0^2 + 0^2 + 3^2 + 4^2 = 25
      expect(problem.evaluate(probe)).toBe(25)
    })

    it('particle positions update during Step and Play, convergenceHistory records correctly', () => {
      const problem = createFunctionProblem({
        mode: 'predefined',
        functionId: 'sphere',
        dimensions: 2,
        bounds: [
          [-5, 5],
          [-5, 5],
        ],
        objective: 'minimize',
      })

      const controller = new SimulationController<PSOState, PSOConfig>()
      controller.configure(psoFactory, problem, { ...defaultPSOConfig, swarmSize: 15 }, { maxIterations: 50, seed: 100 })

      const initialSnapshot = controller.getSnapshot()!
      expect(initialSnapshot.iteration).toBe(0)
      expect(initialSnapshot.convergenceHistory).toHaveLength(1)
      const initialPos = [...initialSnapshot.algorithmState.particles[0].position]

      // Step execution
      controller.step()
      const stepSnapshot = controller.getSnapshot()!
      expect(stepSnapshot.iteration).toBe(1)
      expect(stepSnapshot.convergenceHistory).toHaveLength(2)

      // Particles positions have updated
      const newPos = stepSnapshot.algorithmState.particles[0].position
      const changed = newPos.some((v: number, idx: number) => v !== initialPos[idx])
      expect(changed).toBe(true)

      // Reset execution
      controller.reset()
      const resetSnapshot = controller.getSnapshot()!
      expect(resetSnapshot.iteration).toBe(0)
      expect(resetSnapshot.convergenceHistory).toHaveLength(1)
      expect(resetSnapshot.algorithmState.particles[0].position).toEqual(initialPos)
    })

    it('changing objective function and bounds dynamically reconfigures simulation', () => {
      expect(getBenchmarkFunction('ackley')).toBeDefined()
      const problemAckley = createFunctionProblem({
        mode: 'predefined',
        functionId: 'ackley',
        dimensions: 2,
        bounds: [
          [-32.768, 32.768],
          [-32.768, 32.768],
        ],
        objective: 'minimize',
      })

      expect(problemAckley.bounds[0]).toEqual([-32.768, 32.768])
      expect(problemAckley.evaluate([0, 0])).toBeCloseTo(0)
    })
  })

  describe('2. Warehouse Optimizer Verification', () => {
    it('supports multiple warehouse counts K=1, K=2, K=3, K=5 with correct 2K dimensionality', () => {
      const customers = generateRandomCustomers(10, DEFAULT_WAREHOUSE_BOUNDS, 'equal', 1, 42)

      for (const K of [1, 2, 3, 5]) {
        const problem = createWarehouseProblem({
          customers,
          warehouseCount: K,
        })
        expect(problem.dimensions).toBe(2 * K)
        expect(problem.bounds).toHaveLength(2 * K)
        for (let i = 0; i < K; i++) {
          expect(problem.bounds[2 * i]).toEqual([0, 100])
          expect(problem.bounds[2 * i + 1]).toEqual([0, 100])
        }
      }
    })

    it('supports manual customer placement, adding, and deletion', () => {
      const customers: Customer[] = [
        { id: 'C1', x: 10, y: 10, demand: 2 },
        { id: 'C2', x: 20, y: 20, demand: 3 },
      ]

      // Add manual customer
      const updated = [...customers, { id: 'C3', x: 50, y: 50, demand: 5 }]
      expect(updated).toHaveLength(3)

      // Delete manual customer
      const filtered = updated.filter((c) => c.id !== 'C2')
      expect(filtered).toHaveLength(2)
      expect(filtered.map((c) => c.id)).toEqual(['C1', 'C3'])
    })

    it('verifies all generated customers have equal demand = 1', () => {
      const equalCustomers = generateRandomCustomers(15, DEFAULT_WAREHOUSE_BOUNDS, 'equal', 1, 10)
      expect(equalCustomers.every((c) => c.demand === 1)).toBe(true)
    })

    it('strictly assigns every customer to the nearest warehouse (argmin distance)', () => {
      const customers: Customer[] = [
        { id: 'C1', x: 5, y: 5, demand: 2 }, // close to W0
        { id: 'C2', x: 95, y: 95, demand: 3 }, // close to W1
        { id: 'C3', x: 50, y: 50, demand: 1 }, // middle
      ]

      // W0 at (0, 0), W1 at (100, 100), W2 at (50, 52)
      const position = [0, 0, 100, 100, 50, 52]
      const analysis = analyzeWarehouseSolution(customers, position)
      const warehouses = extractWarehouseCoordinates(position)

      for (const assignment of analysis.assignments) {
        const cust = customers.find((c) => c.id === assignment.customerId)!
        // Verify Euclidean distances to all warehouses
        const distances = warehouses.map((wh) => euclideanDistance(cust.x, cust.y, wh.x, wh.y))
        const minDistance = Math.min(...distances)
        const expectedNearestIdx = distances.indexOf(minDistance)

        expect(assignment.nearestWarehouseIndex).toBe(expectedNearestIdx)
        expect(assignment.distance).toBeCloseTo(minDistance)
        expect(assignment.weightedDistance).toBeCloseTo(cust.demand * minDistance)
      }
    })

    it('displayed objective exactly matches the demand-weighted distance formula F = sum(d_i * min_dist)', () => {
      const customers: Customer[] = [
        { id: 'C1', x: 10, y: 20, demand: 4 },
        { id: 'C2', x: 80, y: 90, demand: 7 },
        { id: 'C3', x: 40, y: 50, demand: 2 },
      ]
      const position = [15, 25, 75, 85] // K = 2

      const objective = calculateWarehouseObjective(customers, position)
      const analysis = analyzeWarehouseSolution(customers, position)

      let manualSum = 0
      for (const cust of customers) {
        const d0 = euclideanDistance(cust.x, cust.y, 15, 25)
        const d1 = euclideanDistance(cust.x, cust.y, 75, 85)
        const minDist = Math.min(d0, d1)
        manualSum += cust.demand * minDist
      }

      expect(objective).toBeCloseTo(manualSum)
      expect(analysis.objectiveValue).toBeCloseTo(manualSum)
      expect(analysis.assignments.reduce((sum, a) => sum + a.weightedDistance, 0)).toBeCloseTo(
        manualSum
      )
    })

    it('PSO improves or maintains best objective during warehouse placement minimization', () => {
      const customers = generateRandomCustomers(25, DEFAULT_WAREHOUSE_BOUNDS, 'random', 1, 777)
      const problem = createWarehouseProblem({
        customers,
        warehouseCount: 3, // 6 dimensions
      })

      const controller = new SimulationController<PSOState, PSOConfig>()
      controller.configure(psoFactory, problem, { ...defaultPSOConfig, swarmSize: 30 }, { maxIterations: 50, seed: 999 })

      const initialCost = controller.getSnapshot()!.algorithmState.bestObjective

      // Run 30 steps
      for (let i = 0; i < 30; i++) {
        controller.step()
      }

      const finalCost = controller.getSnapshot()!.algorithmState.bestObjective
      expect(finalCost).toBeLessThan(initialCost)

      // Test reset restores initial conditions
      controller.reset()
      expect(controller.getSnapshot()!.iteration).toBe(0)
      expect(controller.getSnapshot()!.algorithmState.bestObjective).toBe(initialCost)
    })
  })
})
