export interface BenchmarkFunction {
  id: string
  name: string
  expression: string
  description: string
  validDimensions: number[] | 'any'
  defaultDimensions: number
  defaultBounds: [number, number]
  evaluate: (position: number[]) => number
  knownOptimum?: {
    position: (dimensions: number) => number[]
    value: number
    description: string
  }
}

export const benchmarkFunctions: BenchmarkFunction[] = [
  {
    id: 'sphere',
    name: 'Sphere Function',
    expression: 'f(x) = sum(x_i^2)',
    description:
      'Continuous, convex, unimodal benchmark function. The simplest standard test problem.',
    validDimensions: 'any',
    defaultDimensions: 2,
    defaultBounds: [-5.12, 5.12],
    evaluate: (pos) => pos.reduce((sum, x) => sum + x * x, 0),
    knownOptimum: {
      position: (d) => new Array(d).fill(0),
      value: 0,
      description: 'Minimum at x_i = 0 for all i, f(x) = 0',
    },
  },
  {
    id: 'rastrigin',
    name: 'Rastrigin Function',
    expression: 'f(x) = 10*N + sum(x_i^2 - 10*cos(2*pi*x_i))',
    description:
      'Highly multimodal function with regularly distributed local minima. Prone to trapping algorithms.',
    validDimensions: 'any',
    defaultDimensions: 2,
    defaultBounds: [-5.12, 5.12],
    evaluate: (pos) => {
      const n = pos.length
      return 10 * n + pos.reduce((sum, x) => sum + (x * x - 10 * Math.cos(2 * Math.PI * x)), 0)
    },
    knownOptimum: {
      position: (d) => new Array(d).fill(0),
      value: 0,
      description: 'Global minimum at x_i = 0 for all i, f(x) = 0',
    },
  },
  {
    id: 'ackley',
    name: 'Ackley Function',
    expression: 'f(x) = -20*exp(-0.2*sqrt(1/N*sum(x_i^2))) - exp(1/N*sum(cos(2*pi*x_i))) + 20 + e',
    description:
      'Widely used multimodal test problem with a nearly flat outer region and a steep central funnel.',
    validDimensions: 'any',
    defaultDimensions: 2,
    defaultBounds: [-32.768, 32.768],
    evaluate: (pos) => {
      const n = pos.length
      const sumSq = pos.reduce((sum, x) => sum + x * x, 0)
      const sumCos = pos.reduce((sum, x) => sum + Math.cos(2 * Math.PI * x), 0)
      return (
        -20 * Math.exp(-0.2 * Math.sqrt(sumSq / n)) -
        Math.exp(sumCos / n) +
        20 +
        Math.E
      )
    },
    knownOptimum: {
      position: (d) => new Array(d).fill(0),
      value: 0,
      description: 'Global minimum at x_i = 0 for all i, f(x) = 0',
    },
  },
  {
    id: 'rosenbrock',
    name: 'Rosenbrock (Valley / Banana)',
    expression: 'f(x) = sum(100*(x_{i+1} - x_i^2)^2 + (1 - x_i)^2)',
    description:
      'The global optimum lies inside a narrow, parabolic, curved valley. Easy to find the valley, difficult to converge to the minimum.',
    validDimensions: 'any',
    defaultDimensions: 2,
    defaultBounds: [-5, 10],
    evaluate: (pos) => {
      let sum = 0
      for (let i = 0; i < pos.length - 1; i++) {
        const xi = pos[i]
        const xNext = pos[i + 1]
        sum += 100 * Math.pow(xNext - xi * xi, 2) + Math.pow(1 - xi, 2)
      }
      return sum
    },
    knownOptimum: {
      position: (d) => new Array(d).fill(1),
      value: 0,
      description: 'Global minimum at x_i = 1 for all i, f(x) = 0',
    },
  },
  {
    id: 'beale',
    name: 'Beale Function',
    expression: 'f(x, y) = (1.5 - x + xy)^2 + (2.25 - x + xy^2)^2 + (2.625 - x + xy^3)^2',
    description: 'Multimodal 2D function with sharp peaks at the corners.',
    validDimensions: [2],
    defaultDimensions: 2,
    defaultBounds: [-4.5, 4.5],
    evaluate: (pos) => {
      const x = pos[0]
      const y = pos[1]
      return (
        Math.pow(1.5 - x + x * y, 2) +
        Math.pow(2.25 - x + x * y * y, 2) +
        Math.pow(2.625 - x + x * Math.pow(y, 3), 2)
      )
    },
    knownOptimum: {
      position: () => [3, 0.5],
      value: 0,
      description: 'Global minimum at (3, 0.5), f(x) = 0',
    },
  },
  {
    id: 'himmelblau',
    name: 'Himmelblau Function',
    expression: 'f(x, y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2',
    description:
      '2D test function with four identical local/global minima, testing swarm exploration and diversity.',
    validDimensions: [2],
    defaultDimensions: 2,
    defaultBounds: [-5, 5],
    evaluate: (pos) => {
      const x = pos[0]
      const y = pos[1]
      return Math.pow(x * x + y - 11, 2) + Math.pow(x + y * y - 7, 2)
    },
    knownOptimum: {
      position: () => [3.0, 2.0],
      value: 0,
      description: 'Four global minima with f(x) = 0, e.g. at (3.0, 2.0)',
    },
  },
  {
    id: 'three-hump-camel',
    name: 'Three-Hump Camel Function',
    expression: 'f(x, y) = 2*x^2 - 1.05*x^4 + x^6/6 + xy + y^2',
    description: '2D function with 3 local minima and 1 global minimum.',
    validDimensions: [2],
    defaultDimensions: 2,
    defaultBounds: [-5, 5],
    evaluate: (pos) => {
      const x = pos[0]
      const y = pos[1]
      return 2 * x * x - 1.05 * Math.pow(x, 4) + Math.pow(x, 6) / 6 + x * y + y * y
    },
    knownOptimum: {
      position: () => [0, 0],
      value: 0,
      description: 'Global minimum at (0, 0), f(x) = 0',
    },
  },
]

export function getBenchmarkFunction(id: string): BenchmarkFunction | undefined {
  return benchmarkFunctions.find((f) => f.id === id)
}
