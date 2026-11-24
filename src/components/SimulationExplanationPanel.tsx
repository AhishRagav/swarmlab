import React, { useMemo } from 'react'
import {
  Activity,
  CheckCircle2,
  Compass,
  Footprints,
  Info,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import type { SimulationAction, SimulationStatus } from '@/simulation/types'

export interface SimulationExplanationPanelProps {
  problemType: 'function' | 'warehouse' | 'robot-path'
  status: SimulationStatus
  iteration: number
  maxIterations: number
  lastAction?: SimulationAction
  gbestImproved?: boolean
  extraState?: {
    recoveryOccurred?: boolean
    hasFeasibleSolution?: boolean
    validParticlesCount?: number
  }
  className?: string
}

interface StageDefinition {
  id: string
  label: string
}

export const SimulationExplanationPanel: React.FC<SimulationExplanationPanelProps> = ({
  problemType,
  status,
  iteration,
  maxIterations,
  lastAction = 'init',
  gbestImproved = false,
  extraState,
  className = '',
}) => {
  // Define the ordered lifecycle stages per optimizer
  const stages: StageDefinition[] = useMemo(() => {
    switch (problemType) {
      case 'function':
        return [
          { id: 'init', label: '1. Initialization' },
          { id: 'move', label: '2. Movement' },
          { id: 'eval', label: '3. Evaluation' },
          { id: 'best', label: '4. Pbest/Gbest' },
          { id: 'done', label: '5. Completion' },
        ]
      case 'warehouse':
        return [
          { id: 'init', label: '1. Initialization' },
          { id: 'move', label: '2. Movement' },
          { id: 'assign', label: '3. Assignment' },
          { id: 'eval', label: '4. Evaluation' },
          { id: 'best', label: '5. Pbest/Gbest' },
          { id: 'done', label: '6. Completion' },
        ]
      case 'robot-path':
        return [
          { id: 'init', label: '1. Initialization' },
          { id: 'move', label: '2. Movement' },
          { id: 'collision', label: '3. Collision Check' },
          { id: 'eval', label: '4. Evaluation' },
          { id: 'best', label: '5. Pbest/Gbest' },
          { id: 'done', label: '6. Completion' },
        ]
    }
  }, [problemType])

  // Determine active stage ID based on simulation state
  const activeStageId = useMemo(() => {
    if (iteration >= maxIterations || lastAction === 'complete') {
      return 'done'
    }
    if (iteration === 0 && (status === 'idle' || lastAction === 'init' || lastAction === 'reset')) {
      return 'init'
    }
    if (status === 'paused' && lastAction === 'pause') {
      return 'eval'
    }
    if (gbestImproved) {
      return 'best'
    }
    if (problemType === 'warehouse') {
      return 'assign'
    }
    if (problemType === 'robot-path') {
      return extraState?.recoveryOccurred ? 'collision' : 'eval'
    }
    return 'eval'
  }, [iteration, maxIterations, lastAction, status, gbestImproved, problemType, extraState])

  // Plain-language operational explanation
  const explanation = useMemo(() => {
    // 1. Completion
    if (iteration >= maxIterations || lastAction === 'complete') {
      switch (problemType) {
        case 'function':
          return {
            title: 'Optimization Finished',
            text: 'Optimization finished. Displaying the best solution found.',
            icon: CheckCircle2,
          }
        case 'warehouse':
          return {
            title: 'Optimization Finished',
            text: 'Optimization finished. Displaying the best warehouse arrangement found.',
            icon: CheckCircle2,
          }
        case 'robot-path':
          return {
            title: 'Optimization Finished',
            text: 'Optimization finished. Displaying the best collision-free path found.',
            icon: CheckCircle2,
          }
      }
    }

    // 2. Reset
    if (lastAction === 'reset') {
      switch (problemType) {
        case 'function':
          return {
            title: 'Swarm Reinitialized',
            text: 'Creating particles at different positions in the search space.',
            icon: RotateCcw,
          }
        case 'warehouse':
          return {
            title: 'Swarm Reinitialized',
            text: 'Generating candidate warehouse locations.',
            icon: RotateCcw,
          }
        case 'robot-path':
          return {
            title: 'Swarm Reinitialized',
            text: 'Generating possible paths between the starting point and destination.',
            icon: RotateCcw,
          }
      }
    }

    // 3. Initial state
    if (iteration === 0 && (status === 'idle' || lastAction === 'init')) {
      switch (problemType) {
        case 'function':
          return {
            title: 'Initialization',
            text: 'Creating particles at different positions in the search space.',
            icon: Compass,
          }
        case 'warehouse':
          return {
            title: 'Initialization',
            text: 'Generating candidate warehouse locations.',
            icon: Compass,
          }
        case 'robot-path':
          return {
            title: 'Initialization',
            text: 'Generating possible paths between the starting point and destination.',
            icon: Compass,
          }
      }
    }

    // 4. Paused
    if (lastAction === 'pause' || (status === 'paused' && lastAction !== 'step')) {
      switch (problemType) {
        case 'function':
          return {
            title: 'Optimization Paused',
            text: `Optimization paused at iteration ${iteration}. Each particle remembers its best solution, and the swarm identifies its best solution so far.`,
            icon: Pause,
          }
        case 'warehouse':
          return {
            title: 'Optimization Paused',
            text: `Optimization paused at iteration ${iteration}. Particles are comparing their current warehouse locations with their best-known configurations.`,
            icon: Pause,
          }
        case 'robot-path':
          return {
            title: 'Optimization Paused',
            text: `Optimization paused at iteration ${iteration}. Particles are remembering their best valid paths, while the swarm identifies the best path found so far.`,
            icon: Pause,
          }
      }
    }

    // 5. Step execution
    if (lastAction === 'step') {
      switch (problemType) {
        case 'function':
          if (gbestImproved) {
            return {
              title: `Step ${iteration}: Found Improved Solution`,
              text: 'Each particle remembers its best solution, and the swarm identifies its best solution so far.',
              icon: Sparkles,
            }
          }
          return {
            title: `Step ${iteration}: Moved & Evaluated`,
            text: "Checking how good each particle's current position is by evaluating the function, then particles move using their previous direction, personal best, and global best.",
            icon: Footprints,
          }
        case 'warehouse':
          if (gbestImproved) {
            return {
              title: `Step ${iteration}: Found Better Configuration`,
              text: 'Particles are comparing their current warehouse locations with their best-known configurations and found an improvement.',
              icon: Sparkles,
            }
          }
          return {
            title: `Step ${iteration}: Assigned & Evaluated`,
            text: 'Assigning each customer to the nearest warehouse and calculating the total distance between customers and their assigned warehouses.',
            icon: Footprints,
          }
        case 'robot-path':
          if (extraState?.recoveryOccurred) {
            return {
              title: `Step ${iteration}: Path Recovery Attempt`,
              text: 'A proposed path was invalid, so the optimizer is trying a smaller movement.',
              icon: Activity,
            }
          }
          if (gbestImproved) {
            return {
              title: `Step ${iteration}: Found Better Path`,
              text: 'Particles are remembering their best valid paths, while the swarm identifies the best path found so far.',
              icon: Sparkles,
            }
          }
          return {
            title: `Step ${iteration}: Checked & Evaluated`,
            text: 'Checking whether candidate paths intersect any obstacles and measuring the length and smoothness of valid paths.',
            icon: Footprints,
          }
      }
    }

    // 6. Continuous Playback (Running)
    switch (problemType) {
      case 'function':
        if (gbestImproved) {
          return {
            title: 'Global Best Improved',
            text: 'Each particle remembers its best solution, and the swarm identifies its best solution so far.',
            icon: Sparkles,
          }
        }
        return {
          title: 'Optimizing Swarm',
          text: "Checking how good each particle's current position is by evaluating the function, while particles are moving using their previous direction, personal best, and global best.",
          icon: Play,
        }
      case 'warehouse':
        if (gbestImproved) {
          return {
            title: 'Better Layout Discovered',
            text: 'Particles are comparing their current warehouse locations with their best-known configurations and found a better arrangement.',
            icon: Sparkles,
          }
        }
        return {
          title: 'Assigning & Adjusting',
          text: 'Assigning each customer to the nearest warehouse, calculating the total distance, and adjusting warehouse locations to find a better arrangement.',
          icon: Play,
        }
      case 'robot-path':
        if (extraState?.recoveryOccurred) {
          return {
            title: 'Bypassing Obstacles',
            text: 'A proposed path was invalid, so the optimizer is trying a smaller movement.',
            icon: Activity,
          }
        }
        if (gbestImproved) {
          return {
            title: 'Shorter Safe Route Found',
            text: 'Particles are remembering their best valid paths, while the swarm identifies the best path found so far.',
            icon: Sparkles,
          }
        }
        return {
          title: 'Collision Checking & Tuning',
          text: 'Checking whether candidate paths intersect any obstacles and measuring the length and smoothness of valid paths.',
          icon: Play,
        }
    }
  }, [iteration, maxIterations, lastAction, status, problemType, gbestImproved, extraState])

  const IconComponent = explanation.icon

  return (
    <div
      className={`rounded-lg border border-border bg-card/90 p-3 sm:p-3.5 shadow-sm space-y-2.5 transition-all duration-150 ${className}`}
    >
      {/* Header Row: Title, Action, and Iteration Badge */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <IconComponent className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {explanation.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-muted-foreground">Iteration:</span>
          <span className="font-semibold text-primary">
            {iteration}
          </span>
          <span className="text-muted-foreground">/ {maxIterations}</span>
        </div>
      </div>

      {/* Stage Sequence Pipeline */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        {stages.map((stage, idx) => {
          const isActive = stage.id === activeStageId
          return (
            <React.Fragment key={stage.id}>
              <span
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-black font-semibold shadow-xs'
                    : 'bg-secondary/70 text-muted-foreground border border-border/40'
                }`}
              >
                {stage.label}
              </span>
              {idx < stages.length - 1 && (
                <span className="text-muted-foreground/40 text-[9px] select-none">→</span>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Live Explanation Body */}
      <div className="rounded border-l-2 border-primary bg-secondary/30 px-3 py-2 text-xs text-foreground/90 leading-relaxed font-normal flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <p className="flex-1">{explanation.text}</p>
      </div>
    </div>
  )
}
