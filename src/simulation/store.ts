import { create, type UseBoundStore, type StoreApi } from 'zustand'
import type { AlgorithmConfig, AlgorithmFactory, AlgorithmState } from '@/algorithms/types'
import type { ProblemDefinition } from '@/problems/types'
import { SimulationController } from './controller'
import type { ConvergencePoint, SimulationAction, SimulationOptions, SimulationSnapshot, SimulationStatus } from './types'

export interface SimulationStoreState<
  TState extends AlgorithmState,
  TConfig extends AlgorithmConfig
> {
  status: SimulationStatus
  iteration: number
  speed: number
  snapshot: SimulationSnapshot<TState> | null
  algorithmState: TState | null
  convergenceHistory: ConvergencePoint[]
  problem: ProblemDefinition | null
  maxIterations: number
  lastAction: SimulationAction
  gbestImproved: boolean

  configure: (
    factory: AlgorithmFactory<TState, TConfig>,
    problem: ProblemDefinition,
    config: TConfig,
    options: SimulationOptions
  ) => void
  play: () => void
  pause: () => void
  step: () => void
  reset: () => void
  setSpeed: (speed: number) => void
}

/**
 * Creates a type-safe Zustand store backed by an isolated SimulationController.
 * TState and TConfig preserve the exact algorithm types (e.g. PSOState, PSOConfig).
 */
export function createSimulationStore<
  TState extends AlgorithmState,
  TConfig extends AlgorithmConfig
>(): UseBoundStore<StoreApi<SimulationStoreState<TState, TConfig>>> {
  const controller = new SimulationController<TState, TConfig>()

  return create<SimulationStoreState<TState, TConfig>>((set) => {
    controller.subscribe((snapshot) => {
      set({
        status: snapshot.status,
        iteration: snapshot.iteration,
        snapshot,
        algorithmState: snapshot.algorithmState,
        convergenceHistory: snapshot.convergenceHistory,
        problem: snapshot.problemDefinition,
        maxIterations: snapshot.maxIterations,
        lastAction: snapshot.lastAction ?? 'init',
        gbestImproved: snapshot.gbestImproved ?? false,
      })
    })

    return {
      status: 'idle',
      iteration: 0,
      speed: controller.getSpeed(),
      snapshot: null,
      algorithmState: null,
      convergenceHistory: [],
      problem: null,
      maxIterations: 100,
      lastAction: 'init',
      gbestImproved: false,

      configure: (factory, problem, config, options) => {
        controller.configure(factory, problem, config, options)
      },

      play: () => {
        controller.play()
      },

      pause: () => {
        controller.pause()
      },

      step: () => {
        controller.step()
      },

      reset: () => {
        controller.reset()
      },

      setSpeed: (speed: number) => {
        controller.setSpeed(speed)
        set({ speed: controller.getSpeed() })
      },
    }
  })
}
