import { describe, it, expect } from 'vitest'
import { SimulationController } from '@/simulation/controller'
import { psoFactory, defaultPSOConfig } from '@/algorithms/pso'
import { createFunctionProblem } from '@/problems/function-optimizer/problem'
import funcPageSource from '@/pages/FunctionOptimizerPage.tsx?raw'
import warehousePageSource from '@/pages/WarehousePage.tsx?raw'
import robotPageSource from '@/pages/RobotPathPage.tsx?raw'
import panelSource from '@/components/SimulationExplanationPanel.tsx?raw'

describe('Simulation Live Step Explanation Panel Verification', () => {
  it('SimulationController tracks lastAction and gbestImproved lifecycle events accurately', () => {
    const controller = new SimulationController()
    const problem = createFunctionProblem({
      mode: 'predefined',
      functionId: 'sphere',
      dimensions: 2,
      bounds: [
        [-5, 5],
        [-5, 5],
      ],
      objective: 'minimize',
    })

    // 1. Configure / Init
    controller.configure(psoFactory, problem, defaultPSOConfig, { maxIterations: 10, seed: 42 })
    let snapshot = controller.getSnapshot()
    expect(snapshot?.status).toBe('idle')
    expect(snapshot?.iteration).toBe(0)
    expect(snapshot?.lastAction).toBe('init')
    expect(snapshot?.gbestImproved).toBe(false)

    // 2. Single Step
    controller.step()
    snapshot = controller.getSnapshot()
    expect(snapshot?.iteration).toBe(1)
    expect(snapshot?.lastAction).toBe('step')
    expect(typeof snapshot?.gbestImproved).toBe('boolean')

    // 3. Play
    controller.play()
    snapshot = controller.getSnapshot()
    expect(snapshot?.status).toBe('running')
    expect(snapshot?.lastAction).toBe('play')

    // 4. Pause
    controller.pause()
    snapshot = controller.getSnapshot()
    expect(snapshot?.status).toBe('paused')
    expect(snapshot?.lastAction).toBe('pause')

    // 5. Reset
    controller.reset()
    snapshot = controller.getSnapshot()
    expect(snapshot?.status).toBe('idle')
    expect(snapshot?.iteration).toBe(0)
    expect(snapshot?.lastAction).toBe('reset')
    expect(snapshot?.gbestImproved).toBe(false)
  })

  it('verifies all three pages integrate SimulationExplanationPanel and have removed HowItWorks', () => {
    // 1. Function Optimizer
    expect(funcPageSource).toContain('SimulationExplanationPanel')
    expect(funcPageSource).toContain('problemType="function"')
    expect(funcPageSource).not.toContain('HowItWorks')
    expect(funcPageSource).not.toContain('FUNCTION_OPTIMIZER_STEPS')

    // 2. Warehouse Optimizer
    expect(warehousePageSource).toContain('SimulationExplanationPanel')
    expect(warehousePageSource).toContain('problemType="warehouse"')
    expect(warehousePageSource).not.toContain('HowItWorks')
    expect(warehousePageSource).not.toContain('WAREHOUSE_OPTIMIZER_STEPS')

    // 3. Robot Path Optimizer
    expect(robotPageSource).toContain('SimulationExplanationPanel')
    expect(robotPageSource).toContain('problemType="robot-path"')
    expect(robotPageSource).not.toContain('HowItWorks')
    expect(robotPageSource).not.toContain('ROBOT_PATH_OPTIMIZER_STEPS')
  })

  it('verifies panel contains required beginner-friendly explanations for all states', () => {
    // Function Optimizer requirements
    expect(panelSource).toContain('Creating particles at different positions in the search space.')
    expect(panelSource).toContain("Checking how good each particle's current position is by evaluating the function")
    expect(panelSource).toContain('Each particle remembers its best solution, and the swarm identifies its best solution so far.')
    expect(panelSource).toContain('Optimization finished. Displaying the best solution found.')

    // Warehouse Optimizer requirements
    expect(panelSource).toContain('Generating candidate warehouse locations.')
    expect(panelSource).toContain('Assigning each customer to the nearest warehouse')
    expect(panelSource).toContain('calculating the total distance between customers and their assigned warehouses')
    expect(panelSource).toContain('Optimization finished. Displaying the best warehouse arrangement found.')

    // Robot Path Optimizer requirements
    expect(panelSource).toContain('Generating possible paths between the starting point and destination.')
    expect(panelSource).toContain('Checking whether candidate paths intersect any obstacles')
    expect(panelSource).toContain('measuring the length and smoothness of valid paths')
    expect(panelSource).toContain('A proposed path was invalid, so the optimizer is trying a smaller movement.')
    expect(panelSource).toContain('Optimization finished. Displaying the best collision-free path found.')
  })

  it('contains zero emojis or decorative unicode characters in SimulationExplanationPanel', () => {
    const hasSurrogatePair = /[\uD800-\uDFFF]/
    const forbiddenChars = ['⚠️', '↖', '➕', '📍', '🏁', '🗑', '🎲', '🤖', '⏹', '📦', '⚙️', 'ƒ']

    expect(hasSurrogatePair.test(panelSource)).toBe(false)
    forbiddenChars.forEach((char) => {
      expect(panelSource.includes(char)).toBe(false)
    })
  })
})
