import type { ParameterSchema } from '../types'
import type { PSOConfig } from './types'

export const defaultPSOConfig: PSOConfig = {
  swarmSize: 30,
  w: 0.7298,
  c1: 1.49618,
  c2: 1.49618,
  initialVelocityMode: 'zero',
  velocityClampRatio: 0.2,
  boundaryHandling: 'clipping',
  inertiaMode: 'fixed',
}

export const psoParameterSchema: ParameterSchema[] = [
  {
    name: 'swarmSize',
    label: 'Swarm Size',
    type: 'number',
    default: 30,
    min: 5,
    max: 200,
    step: 1,
    description: 'Number of particles exploring the search space.',
  },
  {
    name: 'w',
    label: 'Inertia Weight (w)',
    type: 'number',
    default: 0.7298,
    min: 0,
    max: 1.5,
    step: 0.01,
    description: 'Controls particle momentum and tendency to maintain current velocity.',
  },
  {
    name: 'c1',
    label: 'Cognitive Coefficient (c1)',
    type: 'number',
    default: 1.49618,
    min: 0,
    max: 4,
    step: 0.05,
    description: 'Attraction towards the particle’s own personal best position.',
  },
  {
    name: 'c2',
    label: 'Social Coefficient (c2)',
    type: 'number',
    default: 1.49618,
    min: 0,
    max: 4,
    step: 0.05,
    description: 'Attraction towards the swarm’s overall global best position.',
  },
  {
    name: 'initialVelocityMode',
    label: 'Initial Velocity',
    type: 'select',
    default: 'zero',
    options: [
      { value: 'zero', label: 'Zero Initialization (Syllabus Default)' },
      { value: 'random', label: 'Random (±10% Range)' },
    ],
    description: 'How initial particle velocities are seeded.',
  },
  {
    name: 'velocityClampRatio',
    label: 'Velocity Clamping (Vmax)',
    type: 'number',
    default: 0.2,
    min: 0.01,
    max: 1.0,
    step: 0.05,
    description: 'Maximum velocity as a fraction of variable range (default 20%).',
  },
  {
    name: 'boundaryHandling',
    label: 'Boundary Handling',
    type: 'select',
    default: 'clipping',
    options: [
      { value: 'clipping', label: 'Position Clipping (Standard)' },
      { value: 'absorb', label: 'Absorb (Zero Velocity)' },
    ],
    description: 'How particles hitting search-space boundaries are constrained.',
  },
  {
    name: 'inertiaMode',
    label: 'Inertia Weight Strategy',
    type: 'select',
    default: 'fixed',
    options: [
      { value: 'fixed', label: 'Fixed Inertia (w)' },
      { value: 'linear-decrease', label: 'Linear Decrease (0.9 → 0.4)' },
    ],
    description: 'Dynamic or static inertia weight schedule.',
  },
]
