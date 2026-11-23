export interface ProblemDefinition {
  id: string
  name: string
  description: string
  dimensions: number
  bounds: [number, number][]
  objective: 'minimize' | 'maximize'
  evaluate(position: number[]): number
}
