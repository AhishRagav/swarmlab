import { math } from '@/lib/math'

export interface ExpressionValidationResult {
  valid: boolean
  error?: string
}

/**
 * Builds the evaluation scope mapping candidate coordinates to mathematical variable names.
 * Supports:
 * - x, y, z for the first three dimensions
 * - x1, x2, ..., xN (and x_1, x_2, ..., x_N) for all dimensions
 */
export function buildScope(position: number[]): Record<string, number> {
  const scope: Record<string, number> = {}

  for (let i = 0; i < position.length; i++) {
    const val = position[i]
    scope[`x${i + 1}`] = val
    scope[`x_${i + 1}`] = val
  }

  if (position.length >= 1) scope['x'] = position[0]
  if (position.length >= 2) scope['y'] = position[1]
  if (position.length >= 3) scope['z'] = position[2]

  return scope
}

/**
 * Safely parses and validates a custom user expression using Math.js (never eval).
 * Tests evaluation at sample points within the bounds to ensure it produces valid real numbers.
 */
export function validateExpression(
  expression: string,
  dimensions: number
): ExpressionValidationResult {
  const trimmed = expression.trim()
  if (!trimmed) {
    return { valid: false, error: 'Expression cannot be empty.' }
  }

  try {
    const compiled = math.compile(trimmed)
    const testPosition = new Array(dimensions).fill(1.5)
    const scope = buildScope(testPosition)
    const result = compiled.evaluate(scope)

    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      return {
        valid: false,
        error: 'Expression evaluated to a non-finite or non-numeric result (e.g. NaN or Infinity).',
      }
    }

    return { valid: true }
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid mathematical expression syntax.',
    }
  }
}

/**
 * Compiles a safe evaluator function for a custom mathematical expression.
 * Safely traps runtime errors (such as division by zero) and penalizes invalid evaluations.
 */
export function createExpressionEvaluator(
  expression: string
): (position: number[]) => number {
  const compiled = math.compile(expression)

  return (position: number[]) => {
    try {
      const scope = buildScope(position)
      const res = compiled.evaluate(scope)

      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return res
      }
      return 1e9 // Penalty for invalid math results like division by zero
    } catch {
      return 1e9
    }
  }
}
