import { describe, it, expect } from 'vitest'
import {
  buildScope,
  createExpressionEvaluator,
  validateExpression,
} from '@/problems/function-optimizer/expression'
import {
  benchmarkFunctions,
  createFunctionProblem,
} from '@/problems/function-optimizer/problem'

describe('Function Optimizer Problem & Expressions', () => {
  it('correctly maps coordinates to variable scope names', () => {
    const scope = buildScope([10, 20, 30, 40])
    expect(scope['x']).toBe(10)
    expect(scope['y']).toBe(20)
    expect(scope['z']).toBe(30)
    expect(scope['x1']).toBe(10)
    expect(scope['x2']).toBe(20)
    expect(scope['x3']).toBe(30)
    expect(scope['x4']).toBe(40)
  })

  it('validates custom expressions safely', () => {
    expect(validateExpression('x^2 + y^2', 2).valid).toBe(true)
    expect(validateExpression('x1^2 + 2*x2^2 + 3*x3^2', 3).valid).toBe(true)
    expect(validateExpression('sin(x) + cos(y)', 2).valid).toBe(true)

    // Invalid syntax
    expect(validateExpression('x^ + +', 2).valid).toBe(false)
    expect(validateExpression('', 2).valid).toBe(false)
  })

  it('evaluates custom expressions without using eval', () => {
    const eval2D = createExpressionEvaluator('x^2 + y^2')
    expect(eval2D([3, 4])).toBe(25)

    const eval3D = createExpressionEvaluator('x1^2 + x2^2 + x3^2')
    expect(eval3D([1, 2, 3])).toBe(14)
  })

  it('benchmark functions evaluate accurately', () => {
    const sphere = benchmarkFunctions.find((f) => f.id === 'sphere')!
    expect(sphere.evaluate([0, 0])).toBe(0)
    expect(sphere.evaluate([1, 2, 3])).toBe(14)

    const rastrigin = benchmarkFunctions.find((f) => f.id === 'rastrigin')!
    expect(rastrigin.evaluate([0, 0])).toBe(0)

    const beale = benchmarkFunctions.find((f) => f.id === 'beale')!
    expect(beale.evaluate([3, 0.5])).toBeCloseTo(0, 5)
  })

  it('enforces dimension constraints for dimension-restricted benchmark functions', () => {
    expect(() =>
      createFunctionProblem({
        mode: 'predefined',
        functionId: 'beale', // Beale only supports 2D
        dimensions: 3,
        bounds: [
          [-4.5, 4.5],
          [-4.5, 4.5],
          [-4.5, 4.5],
        ],
        objective: 'minimize',
      })
    ).toThrow(/only supports dimensions/)
  })

  it('creates custom function problems with per-variable bounds', () => {
    const prob = createFunctionProblem({
      mode: 'custom',
      customExpression: 'x1^2 + x2^2 + x3^2 + x4^2',
      dimensions: 4,
      bounds: [
        [-1, 1],
        [-2, 2],
        [-3, 3],
        [-4, 4],
      ],
      objective: 'minimize',
    })

    expect(prob.dimensions).toBe(4)
    expect(prob.bounds.length).toBe(4)
    expect(prob.evaluate([1, 2, 3, 4])).toBe(30)
  })
})
