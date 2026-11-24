import { describe, it, expect } from 'vitest'
import homeSource from '@/pages/Home.tsx?raw'
import { problemRegistry } from '@/registries/problemRegistry'

describe('Homepage Minimal & Clean Design Verification', () => {
  it('registers all three optimizers in problemRegistry with exact descriptions', () => {
    const problems = problemRegistry.getAll()
    expect(problems).toHaveLength(3)

    const func = problemRegistry.get('function-optimizer')
    expect(func).toBeDefined()
    expect(func?.name).toBe('Mathematical Function Optimizer')
    expect(func?.description).toBe(
      'Finds the best value of a mathematical function while following the constraints you set.'
    )
    expect(func?.route).toBe('/function-optimizer')

    const warehouse = problemRegistry.get('warehouse-optimizer')
    expect(warehouse).toBeDefined()
    expect(warehouse?.name).toBe('Warehouse Placement Optimizer')
    expect(warehouse?.description).toBe(
      'Finds the best locations for warehouses to serve customers efficiently.'
    )
    expect(warehouse?.route).toBe('/warehouse')

    const robot = problemRegistry.get('robot-path-optimizer')
    expect(robot).toBeDefined()
    expect(robot?.name).toBe('Robot Path Planning Optimizer')
    expect(robot?.description).toBe(
      'Finds a safe and efficient path for a robot to reach its destination while avoiding obstacles.'
    )
    expect(robot?.route).toBe('/robot-path')
  })

  it('Home.tsx implements responsive 3-column desktop, 2-column tablet, 1-column mobile grid layout', () => {
    expect(homeSource).toContain('grid-cols-1')
    expect(homeSource).toContain('md:grid-cols-2')
    expect(homeSource).toContain('lg:grid-cols-3')
    expect(homeSource).toContain('gap-5')
  })

  it('Home.tsx does not contain problemIcons, emojis, or decorative symbols in cards', () => {
    expect(homeSource).not.toContain('problemIcons')
    expect(homeSource).not.toContain('📦')
    expect(homeSource).not.toContain('🤖')
    expect(homeSource).not.toContain('⚙️')
    expect(homeSource).not.toContain('ƒ')
  })

  it('Home.tsx does not display visualization labels or technical category badges in cards', () => {
    expect(homeSource).not.toContain('prob.category')
    expect(homeSource).not.toContain('visualizationRegistry')
    expect(homeSource).not.toContain('Visualizations:')
    expect(homeSource).not.toContain('visList')
  })

  it('Cards are fully clickable links with subtle hover transitions', () => {
    expect(homeSource).toContain('to={prob.route}')
    expect(homeSource).toContain('hover:border-primary')
    expect(homeSource).toContain('transition-')
  })
})
