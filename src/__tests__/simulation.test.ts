import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { psoFactory } from '@/algorithms/pso'
import type { PSOConfig } from '@/algorithms/pso/types'
import type { ProblemDefinition } from '@/problems/types'
import { createEvaluateFn, SimulationController } from '@/simulation/controller'

describe('SimulationController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const testProblem: ProblemDefinition = {
    id: 'test-sphere',
    name: 'Sphere',
    description: 'Sphere function',
    dimensions: 2,
    bounds: [
      [-5, 5],
      [-5, 5],
    ],
    objective: 'minimize',
    evaluate: (pos) => pos[0] * pos[0] + pos[1] * pos[1],
  }

  const psoConfig: PSOConfig = {
    swarmSize: 15,
    w: 0.7,
    c1: 1.5,
    c2: 1.5,
  }

  it('initializes to idle state and creates initial convergence history', () => {
    const controller = new SimulationController()
    controller.configure(psoFactory, testProblem, psoConfig, { maxIterations: 50, seed: 42 })

    const snapshot = controller.getSnapshot()
    expect(snapshot).not.toBeNull()
    expect(snapshot?.status).toBe('idle')
    expect(snapshot?.iteration).toBe(0)
    expect(snapshot?.convergenceHistory.length).toBe(1)
    expect(snapshot?.convergenceHistory[0].iteration).toBe(0)
    expect(snapshot?.maxIterations).toBe(50)
  })

  it('step() executes exactly one iteration without changing status', () => {
    const controller = new SimulationController()
    controller.configure(psoFactory, testProblem, psoConfig, { maxIterations: 50, seed: 42 })

    controller.step()

    const snapshot = controller.getSnapshot()
    expect(snapshot?.iteration).toBe(1)
    expect(snapshot?.status).toBe('idle')
    expect(snapshot?.convergenceHistory.length).toBe(2)
  })

  it('play() advances iterations and guards against duplicate timers', () => {
    const controller = new SimulationController()
    controller.configure(psoFactory, testProblem, psoConfig, { maxIterations: 50, seed: 42 })
    controller.setSpeed(10) // 10 iterations per second -> 100ms per iteration

    controller.play()
    expect(controller.getSnapshot()?.status).toBe('running')

    // Calling play() again while running should be a no-op
    controller.play()
    controller.play()

    // Advance 350ms -> 3 iterations
    vi.advanceTimersByTime(350)
    expect(controller.getSnapshot()?.iteration).toBe(3)

    // Pause
    controller.pause()
    expect(controller.getSnapshot()?.status).toBe('paused')
    expect(controller.getSnapshot()?.iteration).toBe(3)

    // Advancing timers should not execute any more steps while paused
    vi.advanceTimersByTime(300)
    expect(controller.getSnapshot()?.iteration).toBe(3)
  })

  it('auto-pauses when reaching maxIterations', () => {
    const controller = new SimulationController()
    controller.configure(psoFactory, testProblem, psoConfig, { maxIterations: 5, seed: 42 })
    controller.setSpeed(20)

    controller.play()
    vi.advanceTimersByTime(500) // More than enough time for 5 iterations

    expect(controller.getSnapshot()?.iteration).toBe(5)
    expect(controller.getSnapshot()?.status).toBe('paused')
  })

  it('reset() clears state and restores reproducibility with seed', () => {
    const controller = new SimulationController()
    controller.configure(psoFactory, testProblem, psoConfig, { maxIterations: 20, seed: 100 })

    // Run 5 steps
    for (let i = 0; i < 5; i++) {
      controller.step()
    }
    const fifthStepFitness = controller.getSnapshot()?.algorithmState.bestFitness

    // Reset
    controller.reset()
    expect(controller.getSnapshot()?.status).toBe('idle')
    expect(controller.getSnapshot()?.iteration).toBe(0)
    expect(controller.getSnapshot()?.convergenceHistory.length).toBe(1)

    // Re-run 5 steps
    for (let i = 0; i < 5; i++) {
      controller.step()
    }
    expect(controller.getSnapshot()?.algorithmState.bestFitness).toBe(fifthStepFitness)
  })

  it('correctly handles maximization: negates fitness for minimization engine while keeping objective un-negated', () => {
    const maxProblem: ProblemDefinition = {
      id: 'max-test',
      name: 'Inverted Parabola',
      description: 'Maximize 100 - x^2',
      dimensions: 1,
      bounds: [[-5, 5]],
      objective: 'maximize',
      evaluate: (pos) => 100 - pos[0] * pos[0],
    }

    const evalFn = createEvaluateFn(maxProblem)
    const res = evalFn([2])

    // Objective is 100 - 4 = 96
    expect(res.objective).toBe(96)
    // Internal fitness is negated: -96
    expect(res.fitness).toBe(-96)

    const controller = new SimulationController()
    controller.configure(psoFactory, maxProblem, psoConfig, { maxIterations: 10, seed: 1 })

    // UI convergenceHistory always records positive objective
    const snapshot = controller.getSnapshot()
    expect(snapshot?.convergenceHistory[0].objectiveValue).toBeGreaterThan(0)
  })
})
