import type { ProblemDefinition } from '@/problems/types'
import { createExpressionEvaluator, validateExpression } from './expression'
import { benchmarkFunctions, getBenchmarkFunction } from './functions'

export interface FunctionProblemConfig {
  mode: 'predefined' | 'custom'
  functionId?: string
  customExpression?: string
  dimensions: number
  bounds: [number, number][]
  objective: 'minimize' | 'maximize'
}

export function createFunctionProblem(config: FunctionProblemConfig): ProblemDefinition {
  const { mode, functionId, customExpression, dimensions, bounds, objective } = config

  if (dimensions < 1 || dimensions > 20) {
    throw new Error('Dimensions must be between 1 and 20.')
  }

  if (bounds.length !== dimensions) {
    throw new Error(`Bounds count (${bounds.length}) does not match dimensions (${dimensions}).`)
  }

  if (mode === 'predefined') {
    const fn = getBenchmarkFunction(functionId || 'sphere')
    if (!fn) {
      throw new Error(`Unknown benchmark function: ${functionId}`)
    }

    if (fn.validDimensions !== 'any' && !fn.validDimensions.includes(dimensions)) {
      throw new Error(
        `Function "${fn.name}" only supports dimensions: ${fn.validDimensions.join(', ')}.`
      )
    }

    return {
      id: `function-optimizer-${fn.id}`,
      name: fn.name,
      description: fn.description,
      dimensions,
      bounds,
      objective,
      evaluate: fn.evaluate,
    }
  }

  // Custom expression mode
  const expr = (customExpression || 'x^2 + y^2').trim()
  const validation = validateExpression(expr, dimensions)
  if (!validation.valid) {
    throw new Error(`Invalid custom expression: ${validation.error}`)
  }

  const evaluate = createExpressionEvaluator(expr)

  return {
    id: 'function-optimizer-custom',
    name: 'Custom Mathematical Function',
    description: `f(${Array.from({ length: dimensions }, (_, i) => `x${i + 1}`).join(', ')}) = ${expr}`,
    dimensions,
    bounds,
    objective,
    evaluate,
  }
}

export { benchmarkFunctions, getBenchmarkFunction }
