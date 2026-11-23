import { describe, it, expect } from 'vitest'

describe('Visualization Data Processing & Sampling', () => {
  it('samples 1D curve evenly over search space bounds', () => {
    const bounds: [number, number] = [-10, 10]
    const numPoints = 21
    const step = (bounds[1] - bounds[0]) / (numPoints - 1)
    const xs: number[] = []
    const ys: number[] = []

    const evalFn = (x: number) => x * x + 3

    for (let i = 0; i < numPoints; i++) {
      const x = bounds[0] + i * step
      xs.push(x)
      ys.push(evalFn(x))
    }

    expect(xs).toHaveLength(21)
    expect(xs[0]).toBeCloseTo(-10)
    expect(xs[20]).toBeCloseTo(10)
    expect(xs[10]).toBeCloseTo(0)
    expect(ys[10]).toBeCloseTo(3) // at x = 0, y = 3
    expect(ys[0]).toBeCloseTo(103) // at x = -10, y = 103
  })

  it('computes 2D contour grid accurately across bounds', () => {
    const b0 = [-5, 5]
    const b1 = [-2, 2]
    const resolution = 11

    const stepX = (b0[1] - b0[0]) / (resolution - 1)
    const stepY = (b1[1] - b1[0]) / (resolution - 1)

    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i < resolution; i++) {
      xs.push(b0[0] + i * stepX)
      ys.push(b1[0] + i * stepY)
    }

    const grid: number[][] = []
    for (let j = 0; j < resolution; j++) {
      const row: number[] = []
      const y = ys[j]
      for (let i = 0; i < resolution; i++) {
        const x = xs[i]
        row.push(x * x + y * y)
      }
      grid.push(row)
    }

    expect(grid).toHaveLength(11)
    expect(grid[0]).toHaveLength(11)
    // At center (x=0, y=0), index (5, 5): 0^2 + 0^2 = 0
    expect(grid[5][5]).toBeCloseTo(0)
    // At corner (x=-5, y=-2), index (0, 0): (-5)^2 + (-2)^2 = 29
    expect(grid[0][0]).toBeCloseTo(29)
  })

  it('calculates slice projection holding other dimensions fixed at gbest', () => {
    const gbest = [1, 2, 3, 4, 5]
    const axisX = 0
    const axisY = 2

    const probe = [...gbest]
    probe[axisX] = 10
    probe[axisY] = 20

    // Axis 0 and 2 are modified, 1, 3, 4 remain unchanged
    expect(probe[0]).toBe(10)
    expect(probe[1]).toBe(2)
    expect(probe[2]).toBe(20)
    expect(probe[3]).toBe(4)
    expect(probe[4]).toBe(5)
  })

  it('normalizes variable values within arbitrary bounds safely', () => {
    const normalize = (val: number, min: number, max: number) => {
      const range = max - min
      if (range <= 0) return 50
      return Math.max(0, Math.min(100, ((val - min) / range) * 100))
    }

    // Centered
    expect(normalize(0, -10, 10)).toBeCloseTo(50)
    // At lower bound
    expect(normalize(-10, -10, 10)).toBeCloseTo(0)
    // At upper bound
    expect(normalize(10, -10, 10)).toBeCloseTo(100)
    // Beyond upper bound (clamped)
    expect(normalize(15, -10, 10)).toBeCloseTo(100)
    // Beyond lower bound (clamped)
    expect(normalize(-20, -10, 10)).toBeCloseTo(0)
    // Asymmetric bounds
    expect(normalize(5, 0, 20)).toBeCloseTo(25)
  })
})
