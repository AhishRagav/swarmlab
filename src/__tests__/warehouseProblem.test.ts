import { describe, it, expect } from 'vitest'
import {
  euclideanDistance,
  extractWarehouseCoordinates,
  calculateWarehouseObjective,
  analyzeWarehouseSolution,
  createWarehouseProblem,
  generateRandomCustomers,
  DEFAULT_WAREHOUSE_BOUNDS,
  type Customer,
} from '@/problems/warehouse'
import { psoFactory, defaultPSOConfig } from '@/algorithms/pso'
import { createRNG } from '@/lib/rng'

describe('Warehouse Placement Problem Mathematics', () => {
  it('calculates Euclidean distance accurately', () => {
    // 3-4-5 right triangle
    expect(euclideanDistance(0, 0, 3, 4)).toBeCloseTo(5)
    // Points at same coordinate
    expect(euclideanDistance(10, 20, 10, 20)).toBe(0)
    // Negative coordinates
    expect(euclideanDistance(-2, -3, 1, 1)).toBeCloseTo(5)
  })

  it('correctly maps 2K dimensional flat vector to K warehouse coordinate pairs', () => {
    const position = [10, 20, 30, 40, 50, 60] // K = 3
    const coords = extractWarehouseCoordinates(position)

    expect(coords).toHaveLength(3)
    expect(coords[0]).toEqual({ x: 10, y: 20 })
    expect(coords[1]).toEqual({ x: 30, y: 40 })
    expect(coords[2]).toEqual({ x: 50, y: 60 })
  })

  it('computes demand-weighted objective F = sum(demand * min_dist) with exact arithmetic', () => {
    // 2 customers:
    // C1: (0, 0), demand = 2
    // C2: (10, 0), demand = 5
    const customers: Customer[] = [
      { id: 'C1', x: 0, y: 0, demand: 2 },
      { id: 'C2', x: 10, y: 0, demand: 5 },
    ]

    // 2 warehouses:
    // W1: (1, 0), W2: (9, 0)
    // Vector: [1, 0, 9, 0]
    const position = [1, 0, 9, 0]

    // C1 is closer to W1 (dist = 1) than W2 (dist = 9). Weighted = 2 * 1 = 2
    // C2 is closer to W2 (dist = 1) than W1 (dist = 9). Weighted = 5 * 1 = 5
    // Total F = 2 + 5 = 7
    const objective = calculateWarehouseObjective(customers, position)
    expect(objective).toBeCloseTo(7)

    const analysis = analyzeWarehouseSolution(customers, position)
    expect(analysis.objectiveValue).toBeCloseTo(7)
    expect(analysis.assignments[0].nearestWarehouseIndex).toBe(0) // C1 -> W1
    expect(analysis.assignments[0].distance).toBeCloseTo(1)
    expect(analysis.assignments[0].weightedDistance).toBeCloseTo(2)

    expect(analysis.assignments[1].nearestWarehouseIndex).toBe(1) // C2 -> W2
    expect(analysis.assignments[1].distance).toBeCloseTo(1)
    expect(analysis.assignments[1].weightedDistance).toBeCloseTo(5)

    expect(analysis.warehouses[0].assignedCustomers).toBe(1)
    expect(analysis.warehouses[0].totalDemandServed).toBe(2)
    expect(analysis.warehouses[1].assignedCustomers).toBe(1)
    expect(analysis.warehouses[1].totalDemandServed).toBe(5)
  })

  it('generates problem definition with exact 2K dimensions and bounds', () => {
    const customers: Customer[] = [
      { id: 'C1', x: 25, y: 25, demand: 1 },
      { id: 'C2', x: 75, y: 75, demand: 2 },
    ]
    const warehouseCount = 4 // K = 4 -> 8 dimensions

    const problem = createWarehouseProblem({
      customers,
      warehouseCount,
      bounds: { minX: 10, maxX: 90, minY: 20, maxY: 80 },
    })

    expect(problem.dimensions).toBe(8)
    expect(problem.bounds).toHaveLength(8)
    expect(problem.objective).toBe('minimize')

    // Check alternating X and Y bounds
    for (let i = 0; i < 4; i++) {
      expect(problem.bounds[2 * i]).toEqual([10, 90])
      expect(problem.bounds[2 * i + 1]).toEqual([20, 80])
    }
  })

  it('rejects invalid warehouse counts and empty customer lists', () => {
    expect(() =>
      createWarehouseProblem({
        customers: [],
        warehouseCount: 2,
      })
    ).toThrow('Customer list cannot be empty.')

    expect(() =>
      createWarehouseProblem({
        customers: [{ id: 'C1', x: 0, y: 0, demand: 1 }],
        warehouseCount: 0,
      })
    ).toThrow('Warehouse count must be at least 1.')
  })

  it('reproducibly generates random customers with seed', () => {
    const cust1 = generateRandomCustomers(5, DEFAULT_WAREHOUSE_BOUNDS, 'equal', 1, 123)
    const cust2 = generateRandomCustomers(5, DEFAULT_WAREHOUSE_BOUNDS, 'equal', 1, 123)

    expect(cust1).toEqual(cust2)
    expect(cust1).toHaveLength(5)
    expect(cust1.every((c) => c.demand === 1)).toBe(true)

    // Check bounds
    cust1.forEach((c) => {
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.x).toBeLessThanOrEqual(100)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeLessThanOrEqual(100)
    })
  })

  it('generates random customer demands in [1, 10]', () => {
    const cust = generateRandomCustomers(20, DEFAULT_WAREHOUSE_BOUNDS, 'random', 1, 999)
    expect(cust).toHaveLength(20)
    cust.forEach((c) => {
      expect(c.demand).toBeGreaterThanOrEqual(1)
      expect(c.demand).toBeLessThanOrEqual(10)
      expect(Number.isInteger(c.demand)).toBe(true)
    })
  })

  it('successfully optimizes warehouse locations using PSO engine', () => {
    // 4 customer clusters at roughly (10, 10), (10, 90), (90, 10), (90, 90)
    const customers: Customer[] = [
      { id: 'C1', x: 10, y: 10, demand: 1 },
      { id: 'C2', x: 10, y: 90, demand: 1 },
      { id: 'C3', x: 90, y: 10, demand: 1 },
      { id: 'C4', x: 90, y: 90, demand: 1 },
    ]

    const problem = createWarehouseProblem({
      customers,
      warehouseCount: 4, // 8 dimensions
      bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    })

    const evaluateFn = (pos: number[]) => {
      const obj = problem.evaluate(pos)
      return { fitness: obj, objective: obj }
    }

    const state0 = psoFactory.createInitialState(
      { ...defaultPSOConfig, swarmSize: 30 },
      problem.bounds,
      evaluateFn,
      createRNG(1234)
    )

    const initialBestCost = state0.bestObjective

    let currentState = state0
    for (let iter = 1; iter <= 40; iter++) {
      currentState = psoFactory.step(
        currentState,
        { ...defaultPSOConfig, swarmSize: 30 },
        problem.bounds,
        evaluateFn,
        createRNG(1234 + iter),
        iter,
        40
      )
    }

    const finalBestCost = currentState.bestObjective
    // PSO should significantly reduce the total distance
    expect(finalBestCost).toBeLessThan(initialBestCost)
    // Coords should remain within bounds [0, 100]
    currentState.bestPosition.forEach((coord) => {
      expect(coord).toBeGreaterThanOrEqual(0)
      expect(coord).toBeLessThanOrEqual(100)
    })
  })
})
