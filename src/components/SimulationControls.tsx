import React from 'react'
import { Button } from '@/components/ui/Button'
import { Slider } from '@/components/ui/Slider'
import type { SimulationStatus } from '@/simulation/types'

export interface SimulationControlsProps {
  status: SimulationStatus
  iteration: number
  maxIterations: number
  speed: number
  onPlay: () => void
  onPause: () => void
  onStep: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  status,
  iteration,
  maxIterations,
  speed,
  onPlay,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
}) => {
  const isFinished = iteration >= maxIterations
  const isRunning = status === 'running'

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card shadow-sm">
      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Button variant="default" onClick={onPause} className="w-24">
            ⏸ Pause
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={onPlay}
            disabled={isFinished}
            className="w-24"
          >
            ▶ Play
          </Button>
        )}

        <Button
          variant="outline"
          onClick={onStep}
          disabled={isRunning || isFinished}
          title="Execute exactly one iteration"
        >
          ⏭ Step
        </Button>

        <Button variant="outline" onClick={onReset} title="Reset to initial state">
          ↺ Reset
        </Button>
      </div>

      {/* Progress & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground">Iteration:</span>
          <span className="font-mono text-foreground font-semibold">
            {iteration} / {maxIterations}
          </span>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
            status === 'running'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : status === 'paused'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              : 'bg-muted text-muted-foreground border border-border'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Speed Slider */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
          Speed: <span className="text-foreground font-mono">{speed} it/s</span>
        </span>
        <Slider
          value={speed}
          onChange={onSpeedChange}
          min={1}
          max={60}
          step={1}
          className="w-32"
        />
      </div>
    </div>
  )
}
