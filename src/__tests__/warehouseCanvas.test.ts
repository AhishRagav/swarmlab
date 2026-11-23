import { describe, it, expect } from 'vitest'
import {
  toCanvasCoords,
  toWorldCoords,
  getCustomerRadius,
  getWarehouseColor,
  DEFAULT_CANVAS_PADDING,
} from '@/visualization/warehouse/canvasUtils'
import type { WarehouseBounds } from '@/problems/warehouse/types'

describe('Phase 6 Warehouse Canvas Coordinate Transformations & Rendering Logic', () => {
  const bounds: WarehouseBounds = {
    minX: 0,
    maxX: 100,
    minY: 0,
    maxY: 100,
  }

  const canvasSize = {
    width: 600,
    height: 400,
  }

  it('transforms world min coordinates to canvas bottom-left (with padding)', () => {
    const minPoint = { x: 0, y: 0 }
    const pixel = toCanvasCoords(minPoint, bounds, canvasSize, DEFAULT_CANVAS_PADDING)

    // X should equal left padding
    expect(pixel.x).toBeCloseTo(DEFAULT_CANVAS_PADDING.left)
    // Y should equal canvas height minus bottom padding (standard screen Y is inverted)
    expect(pixel.y).toBeCloseTo(canvasSize.height - DEFAULT_CANVAS_PADDING.bottom)
  })

  it('transforms world max coordinates to canvas top-right (with padding)', () => {
    const maxPoint = { x: 100, y: 100 }
    const pixel = toCanvasCoords(maxPoint, bounds, canvasSize, DEFAULT_CANVAS_PADDING)

    // X should equal width minus right padding
    expect(pixel.x).toBeCloseTo(canvasSize.width - DEFAULT_CANVAS_PADDING.right)
    // Y should equal top padding
    expect(pixel.y).toBeCloseTo(DEFAULT_CANVAS_PADDING.top)
  })

  it('accurately inverts canvas pixel coordinates back to world coordinates', () => {
    const testPoints = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      { x: 23.45, y: 87.65 },
      { x: 0, y: 100 },
      { x: 100, y: 0 },
    ]

    for (const worldPt of testPoints) {
      const pixel = toCanvasCoords(worldPt, bounds, canvasSize, DEFAULT_CANVAS_PADDING)
      const reconstructed = toWorldCoords(pixel, bounds, canvasSize, DEFAULT_CANVAS_PADDING)

      expect(reconstructed.x).toBeCloseTo(worldPt.x, 1)
      expect(reconstructed.y).toBeCloseTo(worldPt.y, 1)
    }
  })

  it('calculates customer marker radius proportional to demand with safe bounds', () => {
    const r1 = getCustomerRadius(1)
    const r4 = getCustomerRadius(4)
    const r9 = getCustomerRadius(9)
    const r100 = getCustomerRadius(100)
    const rZero = getCustomerRadius(0)
    const rNeg = getCustomerRadius(-5)

    // Monotonic increase
    expect(r4).toBeGreaterThan(r1)
    expect(r9).toBeGreaterThan(r4)

    // Bounds [5, 14]
    expect(r1).toBeGreaterThanOrEqual(5)
    expect(r100).toBeLessThanOrEqual(14)
    expect(rZero).toBeGreaterThanOrEqual(5)
    expect(rNeg).toBeGreaterThanOrEqual(5)
  })

  it('provides distinct, consistent color palettes for arbitrary warehouse indices', () => {
    const c0 = getWarehouseColor(0)
    const c1 = getWarehouseColor(1)
    const c2 = getWarehouseColor(2)
    const c10 = getWarehouseColor(10) // wraps around palette

    expect(c0.main).toBeDefined()
    expect(c1.main).toBeDefined()
    expect(c0.main).not.toBe(c1.main)
    expect(c1.main).not.toBe(c2.main)
    // Wrap-around check
    expect(c10.main).toBe(c0.main)
  })
})
