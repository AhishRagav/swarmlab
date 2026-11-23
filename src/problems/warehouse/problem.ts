import type { ProblemDefinition } from '@/problems/types'
import { createRNG } from '@/lib/rng'
import type {
  Customer,
  WarehouseBounds,
  WarehouseProblemConfig,
  CustomerAssignment,
  WarehouseLocation,
  WarehouseSolutionAnalysis,
} from './types'

export const DEFAULT_WAREHOUSE_BOUNDS: WarehouseBounds = {
  minX: 0,
  maxX: 100,
  minY: 0,
  maxY: 100,
}

/**
 * Parses a flat 2K-dimensional particle position vector into an array of warehouse coordinates.
 * Vector layout: [w0_x, w0_y, w1_x, w1_y, ..., w(K-1)_x, w(K-1)_y]
 */
export function extractWarehouseCoordinates(
  position: number[]
): { x: number; y: number }[] {
  const warehouses: { x: number; y: number }[] = []
  const k = Math.floor(position.length / 2)
  for (let i = 0; i < k; i++) {
    warehouses.push({
      x: position[2 * i],
      y: position[2 * i + 1],
    })
  }
  return warehouses
}

/**
 * Calculates Euclidean distance between two points in 2D space.
 */
export function euclideanDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Mathematical objective function for Warehouse Placement:
 * F = sum_{i in customers} [demand_i * min_{k in warehouses} dist(customer_i, warehouse_k)]
 *
 * Evaluates the flat 2K-dimensional position vector.
 */
export function calculateWarehouseObjective(
  customers: Customer[],
  position: number[]
): number {
  if (customers.length === 0) return 0

  const warehouses = extractWarehouseCoordinates(position)
  if (warehouses.length === 0) return 0

  let totalWeightedDistance = 0

  for (let i = 0; i < customers.length; i++) {
    const cust = customers[i]
    let minDistance = Infinity

    for (let k = 0; k < warehouses.length; k++) {
      const wh = warehouses[k]
      const dist = euclideanDistance(cust.x, cust.y, wh.x, wh.y)
      if (dist < minDistance) {
        minDistance = dist
      }
    }

    totalWeightedDistance += cust.demand * minDistance
  }

  return totalWeightedDistance
}

/**
 * Computes customer assignments and aggregate metrics for a candidate warehouse position vector.
 */
export function analyzeWarehouseSolution(
  customers: Customer[],
  position: number[]
): WarehouseSolutionAnalysis {
  const warehousesCoords = extractWarehouseCoordinates(position)
  const warehouseStats: WarehouseLocation[] = warehousesCoords.map((wh, idx) => ({
    index: idx,
    x: wh.x,
    y: wh.y,
    assignedCustomers: 0,
    totalDemandServed: 0,
  }))

  const assignments: CustomerAssignment[] = []
  let totalCost = 0

  for (let i = 0; i < customers.length; i++) {
    const cust = customers[i]
    let nearestIdx = 0
    let minDistance = Infinity

    for (let k = 0; k < warehousesCoords.length; k++) {
      const wh = warehousesCoords[k]
      const dist = euclideanDistance(cust.x, cust.y, wh.x, wh.y)
      if (dist < minDistance) {
        minDistance = dist
        nearestIdx = k
      }
    }

    const weightedDist = cust.demand * minDistance
    totalCost += weightedDist

    assignments.push({
      customerId: cust.id,
      customerX: cust.x,
      customerY: cust.y,
      demand: cust.demand,
      nearestWarehouseIndex: nearestIdx,
      distance: minDistance,
      weightedDistance: weightedDist,
    })

    if (warehouseStats[nearestIdx]) {
      warehouseStats[nearestIdx].assignedCustomers += 1
      warehouseStats[nearestIdx].totalDemandServed += cust.demand
    }
  }

  return {
    objectiveValue: totalCost,
    assignments,
    warehouses: warehouseStats,
  }
}

/**
 * Creates a standard ProblemDefinition compatible with the PSO engine and SimulationController.
 */
export function createWarehouseProblem(
  config: WarehouseProblemConfig
): ProblemDefinition {
  const { customers, warehouseCount, bounds = DEFAULT_WAREHOUSE_BOUNDS } = config

  if (warehouseCount < 1) {
    throw new Error('Warehouse count must be at least 1.')
  }
  if (customers.length === 0) {
    throw new Error('Customer list cannot be empty.')
  }

  const dimensions = warehouseCount * 2
  const boundsList: [number, number][] = []

  for (let k = 0; k < warehouseCount; k++) {
    boundsList.push([bounds.minX, bounds.maxX]) // x coordinate bound
    boundsList.push([bounds.minY, bounds.maxY]) // y coordinate bound
  }

  return {
    id: `warehouse-optimizer-${warehouseCount}wh-${customers.length}cust`,
    name: `Warehouse Placement (${warehouseCount} Warehouses, ${customers.length} Customers)`,
    description:
      'Optimizes 2D coordinates for warehouses to minimize customer demand-weighted Euclidean distances.',
    dimensions,
    bounds: boundsList,
    objective: 'minimize',
    evaluate: (pos: number[]) => calculateWarehouseObjective(customers, pos),
  }
}

/**
 * Utility to generate customer distributions (equal or random demand) reproducibly.
 */
export function generateRandomCustomers(
  count: number,
  bounds: WarehouseBounds = DEFAULT_WAREHOUSE_BOUNDS,
  demandMode: 'equal' | 'random' = 'equal',
  fixedDemand = 1,
  seed?: number
): Customer[] {
  const rng = createRNG(seed)
  const customers: Customer[] = []

  const spanX = bounds.maxX - bounds.minX
  const spanY = bounds.maxY - bounds.minY

  for (let i = 0; i < count; i++) {
    const x = bounds.minX + rng.random() * spanX
    const y = bounds.minY + rng.random() * spanY
    const demand =
      demandMode === 'equal'
        ? fixedDemand
        : Math.floor(rng.random() * 10) + 1 // integer demand between 1 and 10

    customers.push({
      id: `C${i + 1}`,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      demand,
    })
  }

  return customers
}
