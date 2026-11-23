export interface Customer {
  id: string
  x: number
  y: number
  demand: number
}

export type CustomerPlacementMode = 'random' | 'manual'
export type CustomerDemandMode = 'equal' | 'random' | 'manual'

export interface WarehouseBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface WarehouseProblemConfig {
  customers: Customer[]
  warehouseCount: number
  bounds?: WarehouseBounds
}

export interface CustomerAssignment {
  customerId: string
  customerX: number
  customerY: number
  demand: number
  nearestWarehouseIndex: number // 0-based index: 0, 1, ..., K-1
  distance: number
  weightedDistance: number
}

export interface WarehouseLocation {
  index: number // 0-based index
  x: number
  y: number
  assignedCustomers: number
  totalDemandServed: number
}

export interface WarehouseSolutionAnalysis {
  objectiveValue: number // Total demand-weighted distance
  assignments: CustomerAssignment[]
  warehouses: WarehouseLocation[]
}
