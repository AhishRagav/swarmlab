import type { AlgorithmConfig, AlgorithmFactory, AlgorithmState, EvaluateFn } from '@/algorithms/types'
import { createRNG, type RNG } from '@/lib/rng'
import type { ProblemDefinition } from '@/problems/types'
import type {
  ConvergencePoint,
  SimulationOptions,
  SimulationSnapshot,
  SimulationStatus,
} from './types'

export function createEvaluateFn(problem: ProblemDefinition): EvaluateFn {
  if (problem.objective === 'maximize') {
    return (position: number[]) => {
      const objective = problem.evaluate(position)
      return {
        fitness: -objective,
        objective,
      }
    }
  }

  return (position: number[]) => {
    const objective = problem.evaluate(position)
    return {
      fitness: objective,
      objective,
    }
  }
}

export class SimulationController<
  TState extends AlgorithmState,
  TConfig extends AlgorithmConfig
> {
  private status: SimulationStatus = 'idle'
  private iteration = 0
  private speed = 20 // Iterations per second
  private timerId: ReturnType<typeof setInterval> | null = null

  private factory: AlgorithmFactory<TState, TConfig> | null = null
  private problem: ProblemDefinition | null = null
  private config: TConfig | null = null
  private options: SimulationOptions = { maxIterations: 100 }

  private evaluateFn: EvaluateFn | null = null
  private rng: RNG | null = null

  private currentState: TState | null = null
  private initialState: TState | null = null
  private convergenceHistory: ConvergencePoint[] = []

  private listeners = new Set<(snapshot: SimulationSnapshot<TState>) => void>()

  public subscribe(listener: (snapshot: SimulationSnapshot<TState>) => void): () => void {
    this.listeners.add(listener)
    if (this.currentState && this.problem) {
      listener(this.getSnapshot()!)
    }
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    if (snapshot) {
      for (const listener of this.listeners) {
        listener(snapshot)
      }
    }
  }

  public configure(
    factory: AlgorithmFactory<TState, TConfig>,
    problem: ProblemDefinition,
    config: TConfig,
    options: SimulationOptions
  ): void {
    this.stopTimer()

    this.factory = factory
    this.problem = problem
    this.config = config
    this.options = { ...options }
    this.iteration = 0
    this.status = 'idle'

    this.evaluateFn = createEvaluateFn(problem)
    this.rng = createRNG(options.seed)

    const initial = factory.createInitialState(config, problem.bounds, this.evaluateFn, this.rng)
    this.currentState = initial
    this.initialState = initial

    this.convergenceHistory = [
      {
        iteration: 0,
        objectiveValue: initial.bestObjective,
      },
    ]

    this.notify()
  }

  public play(): void {
    // Duplicate timer prevention: no-op if already running
    if (this.status === 'running') {
      return
    }

    if (!this.factory || !this.problem || !this.config || !this.currentState) {
      return
    }

    if (this.iteration >= this.options.maxIterations) {
      return
    }

    this.status = 'running'
    this.startTimer()
    this.notify()
  }

  public pause(): void {
    if (this.status !== 'running') {
      return
    }

    this.stopTimer()
    this.status = 'paused'
    this.notify()
  }

  public step(): void {
    // Step is only executed when idle or paused
    if (this.status === 'running') {
      return
    }

    if (!this.factory || !this.problem || !this.config || !this.currentState || !this.rng || !this.evaluateFn) {
      return
    }

    if (this.iteration >= this.options.maxIterations) {
      return
    }

    this.performStep()
  }

  public reset(): void {
    this.stopTimer()
    this.status = 'idle'
    this.iteration = 0

    if (this.factory && this.problem && this.config) {
      // Re-create the RNG with the same seed so re-running produces identical trajectories
      this.rng = createRNG(this.options.seed)
      this.evaluateFn = createEvaluateFn(this.problem)

      const initial = this.factory.createInitialState(
        this.config,
        this.problem.bounds,
        this.evaluateFn,
        this.rng
      )
      this.currentState = initial
      this.initialState = initial

      this.convergenceHistory = [
        {
          iteration: 0,
          objectiveValue: initial.bestObjective,
        },
      ]
    } else {
      this.currentState = this.initialState
      this.convergenceHistory = this.initialState
        ? [
            {
              iteration: 0,
              objectiveValue: this.initialState.bestObjective,
            },
          ]
        : []
    }

    this.notify()
  }

  public setSpeed(iterationsPerSecond: number): void {
    const validSpeed = Math.max(1, Math.min(100, iterationsPerSecond))
    this.speed = validSpeed

    if (this.status === 'running') {
      this.stopTimer()
      this.startTimer()
    }
  }

  public getSpeed(): number {
    return this.speed
  }

  public getSnapshot(): SimulationSnapshot<TState> | null {
    if (!this.currentState || !this.problem) {
      return null
    }

    return {
      status: this.status,
      iteration: this.iteration,
      algorithmState: this.currentState,
      convergenceHistory: [...this.convergenceHistory],
      maxIterations: this.options.maxIterations,
      problemDefinition: this.problem,
    }
  }

  private performStep(): void {
    if (!this.factory || !this.problem || !this.config || !this.currentState || !this.rng || !this.evaluateFn) {
      return
    }

    this.currentState = this.factory.step(
      this.currentState,
      this.config,
      this.problem.bounds,
      this.evaluateFn,
      this.rng,
      this.iteration,
      this.options.maxIterations
    )

    this.iteration += 1

    this.convergenceHistory.push({
      iteration: this.iteration,
      objectiveValue: this.currentState.bestObjective,
    })

    if (this.iteration >= this.options.maxIterations) {
      this.stopTimer()
      this.status = 'paused'
    }

    this.notify()
  }

  private startTimer(): void {
    const intervalMs = Math.round(1000 / this.speed)
    this.timerId = setInterval(() => {
      this.performStep()
    }, intervalMs)
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }
}
