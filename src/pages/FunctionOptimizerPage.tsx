import { useState, useEffect, useMemo, useCallback } from 'react'
import { psoFactory, defaultPSOConfig } from '@/algorithms/pso'
import type { PSOConfig, PSOState } from '@/algorithms/pso/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SimulationControls } from '@/components/SimulationControls'
import {
  benchmarkFunctions,
  createFunctionProblem,
  getBenchmarkFunction,
} from '@/problems/function-optimizer/problem'
import { validateExpression } from '@/problems/function-optimizer/expression'
import { createSimulationStore } from '@/simulation/store'
import {
  CurvePlot,
  ContourPlot,
  SurfacePlot,
  ProjectionPlot,
  VariableTable,
  ConvergenceChart,
} from '@/visualization'

// Dedicated simulation store for the Function Optimizer page
const useFunctionStore = createSimulationStore<PSOState, PSOConfig>()

export default function FunctionOptimizerPage() {
  const {
    status,
    iteration,
    speed,
    snapshot,
    algorithmState,
    maxIterations,
    configure,
    play,
    pause,
    step,
    reset,
    setSpeed,
  } = useFunctionStore()

  // Problem configuration state
  const [dimensions, setDimensions] = useState<number>(2)
  const [mode, setMode] = useState<'predefined' | 'custom'>('predefined')
  const [functionId, setFunctionId] = useState<string>('sphere')
  const [customExpr, setCustomExpr] = useState<string>('x^2 + y^2')
  const [objective, setObjective] = useState<'minimize' | 'maximize'>('minimize')
  const [bounds, setBounds] = useState<[number, number][]>([
    [-5.12, 5.12],
    [-5.12, 5.12],
  ])

  // Uniform bound quick-set
  const [uniformMin, setUniformMin] = useState<number>(-5.12)
  const [uniformMax, setUniformMax] = useState<number>(5.12)

  // PSO configuration state
  const [psoConfig, setPsoConfig] = useState<PSOConfig>({ ...defaultPSOConfig })
  const [maxIters, setMaxIters] = useState<number>(100)
  const [seedInput, setSeedInput] = useState<string>('42')

  // Validation state for custom expressions
  const exprValidation = useMemo(() => {
    if (mode === 'custom') {
      return validateExpression(customExpr, dimensions)
    }
    return { valid: true }
  }, [mode, customExpr, dimensions])

  // Adjust bounds array when dimension changes
  const handleDimensionChange = (newDim: number) => {
    const validDim = Math.max(1, Math.min(20, newDim))
    setDimensions(validDim)

    setBounds((prev) => {
      const next: [number, number][] = []
      for (let i = 0; i < validDim; i++) {
        next.push(prev[i] ? [...prev[i]] : [uniformMin, uniformMax])
      }
      return next
    })
  }

  // Handle benchmark selection
  const handleBenchmarkChange = (id: string) => {
    setFunctionId(id)
    const fn = getBenchmarkFunction(id)
    if (fn) {
      if (fn.validDimensions !== 'any' && !fn.validDimensions.includes(dimensions)) {
        handleDimensionChange(fn.defaultDimensions)
      }
      setUniformMin(fn.defaultBounds[0])
      setUniformMax(fn.defaultBounds[1])
      setBounds(Array.from({ length: dimensions }, () => [...fn.defaultBounds]))
    }
  }

  // Apply uniform bounds
  const applyUniformBounds = () => {
    if (uniformMin >= uniformMax) return
    setBounds(Array.from({ length: dimensions }, () => [uniformMin, uniformMax]))
  }

  // Problem definition memoized for both simulation and visualization
  const currentProblem = useMemo(() => {
    try {
      return createFunctionProblem({
        mode,
        functionId,
        customExpression: customExpr,
        dimensions,
        bounds,
        objective,
      })
    } catch {
      return null
    }
  }, [mode, functionId, customExpr, dimensions, bounds, objective])

  // Initialize or re-configure simulation
  const applyConfiguration = useCallback(() => {
    if (!currentProblem) return
    try {
      const seed = seedInput.trim() !== '' ? parseInt(seedInput, 10) : undefined

      configure(psoFactory, currentProblem, psoConfig, {
        maxIterations: maxIters,
        seed: isNaN(seed as number) ? undefined : seed,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error configuring problem.')
    }
  }, [currentProblem, psoConfig, maxIters, seedInput, configure])

  // Configure once on initial mount
  useEffect(() => {
    applyConfiguration()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedBenchmark = getBenchmarkFunction(functionId)

  // Quick stats
  const initialObjective = snapshot?.convergenceHistory[0]?.objectiveValue
  const currentObjective = algorithmState?.bestObjective
  const improvement =
    initialObjective !== undefined && currentObjective !== undefined
      ? objective === 'minimize'
        ? initialObjective !== 0
          ? (((initialObjective - currentObjective) / Math.abs(initialObjective)) * 100).toFixed(2)
          : '0'
        : initialObjective !== 0
        ? (((currentObjective - initialObjective) / Math.abs(initialObjective)) * 100).toFixed(2)
        : '0'
      : '0'

  return (
    <div className="space-y-8">
      {/* Page Title & Intro */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mathematical Function Optimizer</h1>
        <p className="text-muted-foreground mt-1">
          Explore and optimize N-dimensional continuous functions (1 to 20 dimensions) using real
          Particle Swarm Optimization.
        </p>
      </div>

      {/* Main Grid: Parameters on Left, Simulation & Live State on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Problem & PSO Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Problem Setup Card */}
          <Card>
            <CardHeader>
              <CardTitle>Objective Function</CardTitle>
              <CardDescription>
                Configure the benchmark problem or input a custom formula.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-lg text-sm">
                <button
                  type="button"
                  className={`py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
                    mode === 'predefined'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMode('predefined')}
                >
                  Benchmark Function
                </button>
                <button
                  type="button"
                  className={`py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
                    mode === 'custom'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMode('custom')}
                >
                  Custom Expression
                </button>
              </div>

              {/* Predefined Selection */}
              {mode === 'predefined' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                      Function
                    </label>
                    <Select
                      value={functionId}
                      onChange={(e) => handleBenchmarkChange(e.target.value)}
                      options={benchmarkFunctions.map((f) => ({
                        value: f.id,
                        label: `${f.name} (${f.validDimensions === 'any' ? 'Any N' : f.validDimensions.join(',') + 'D'})`,
                      }))}
                    />
                  </div>

                  {selectedBenchmark && (
                    <div className="p-3 bg-secondary/60 rounded-md border border-border text-xs space-y-1">
                      <div className="font-mono text-primary font-medium">
                        {selectedBenchmark.expression}
                      </div>
                      <p className="text-muted-foreground">{selectedBenchmark.description}</p>
                      {selectedBenchmark.knownOptimum && (
                        <div className="text-muted-foreground pt-1">
                          <span className="font-semibold text-foreground">Optimum: </span>
                          {selectedBenchmark.knownOptimum.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Custom Expression */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                      Formula
                    </label>
                    <Input
                      value={customExpr}
                      onChange={(e) => setCustomExpr(e.target.value)}
                      placeholder="e.g. x^2 + y^2 or x1^2 + 2*x2^2 + 3*x3^2"
                      className="font-mono text-sm"
                    />
                  </div>

                  {!exprValidation.valid && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ {exprValidation.error}
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground p-2.5 bg-secondary/50 rounded-md border border-border leading-relaxed">
                    <span className="font-semibold text-foreground">Variables: </span>
                    Use <code className="text-primary font-mono">x, y, z</code> for dimensions 1-3, or{' '}
                    <code className="text-primary font-mono">x1, x2, ... xN</code> for any dimension.
                    Standard math functions (<code className="font-mono">sin, cos, exp, sqrt, abs, log</code>) are supported.
                  </div>
                </div>
              )}

              {/* Dimensions Selector */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Dimensions (N)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={dimensions}
                    onChange={(e) => handleDimensionChange(parseInt(e.target.value, 10) || 1)}
                    disabled={
                      mode === 'predefined' &&
                      selectedBenchmark?.validDimensions !== 'any' &&
                      selectedBenchmark?.validDimensions.length === 1
                    }
                  />
                  {mode === 'predefined' && selectedBenchmark?.validDimensions !== 'any' && (
                    <span className="text-[11px] text-muted-foreground">
                      Locked to {selectedBenchmark?.validDimensions.join(', ')}D
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Goal
                  </label>
                  <Select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value as 'minimize' | 'maximize')}
                    options={[
                      { value: 'minimize', label: 'Minimize' },
                      { value: 'maximize', label: 'Maximize' },
                    ]}
                  />
                </div>
              </div>

              {/* Per-variable Search Bounds */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Search Bounds
                  </label>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Input
                      type="number"
                      value={uniformMin}
                      onChange={(e) => setUniformMin(parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 text-xs px-2"
                      placeholder="Min"
                    />
                    <Input
                      type="number"
                      value={uniformMax}
                      onChange={(e) => setUniformMax(parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 text-xs px-2"
                      placeholder="Max"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={applyUniformBounds}
                      className="h-7 text-xs px-2"
                    >
                      Set All
                    </Button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {bounds.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-8 font-mono text-muted-foreground text-right">
                        x{idx + 1}:
                      </span>
                      <Input
                        type="number"
                        value={b[0]}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setBounds((curr) => {
                            const n = [...curr]
                            n[idx] = [val, n[idx][1]]
                            return n
                          })
                        }}
                        className="h-7 text-xs px-2"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="number"
                        value={b[1]}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          setBounds((curr) => {
                            const n = [...curr]
                            n[idx] = [n[idx][0], val]
                            return n
                          })
                        }}
                        className="h-7 text-xs px-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PSO Algorithm Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Parameters (PSO)</CardTitle>
              <CardDescription>
                Configure swarm population, velocity weights, and limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Swarm Size
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={200}
                    value={psoConfig.swarmSize}
                    onChange={(e) =>
                      setPsoConfig((prev) => ({
                        ...prev,
                        swarmSize: parseInt(e.target.value, 10) || 10,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Max Iterations
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={2000}
                    value={maxIters}
                    onChange={(e) => setMaxIters(parseInt(e.target.value, 10) || 50)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1" title="Inertia weight">
                    Inertia (w)
                  </label>
                  <Input
                    type="number"
                    step={0.05}
                    value={psoConfig.w}
                    disabled={psoConfig.inertiaMode === 'linear-decrease'}
                    onChange={(e) =>
                      setPsoConfig((prev) => ({
                        ...prev,
                        w: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                  {psoConfig.inertiaMode === 'linear-decrease' && (
                    <span className="text-[10px] text-muted-foreground">0.9 → 0.4</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1" title="Cognitive acceleration">
                    Cognitive (c1)
                  </label>
                  <Input
                    type="number"
                    step={0.05}
                    value={psoConfig.c1}
                    onChange={(e) =>
                      setPsoConfig((prev) => ({
                        ...prev,
                        c1: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1" title="Social acceleration">
                    Social (c2)
                  </label>
                  <Input
                    type="number"
                    step={0.05}
                    value={psoConfig.c2}
                    onChange={(e) =>
                      setPsoConfig((prev) => ({
                        ...prev,
                        c2: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Syllabus-aligned Advanced Controls */}
              <div className="pt-2 border-t border-border space-y-3">
                <span className="text-xs font-semibold uppercase text-muted-foreground block">
                  Syllabus Execution Options
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Initial Velocity
                    </label>
                    <Select
                      value={psoConfig.initialVelocityMode ?? 'zero'}
                      onChange={(e) =>
                        setPsoConfig((prev) => ({
                          ...prev,
                          initialVelocityMode: e.target.value as 'zero' | 'random',
                        }))
                      }
                      options={[
                        { value: 'zero', label: 'Zero (Syllabus Default)' },
                        { value: 'random', label: 'Random (±10% Range)' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Boundary Handling
                    </label>
                    <Select
                      value={psoConfig.boundaryHandling ?? 'clipping'}
                      onChange={(e) =>
                        setPsoConfig((prev) => ({
                          ...prev,
                          boundaryHandling: e.target.value as 'clipping' | 'absorb',
                        }))
                      }
                      options={[
                        { value: 'clipping', label: 'Position Clipping (Default)' },
                        { value: 'absorb', label: 'Absorb (Zero Velocity)' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Inertia Schedule
                    </label>
                    <Select
                      value={psoConfig.inertiaMode ?? 'fixed'}
                      onChange={(e) =>
                        setPsoConfig((prev) => ({
                          ...prev,
                          inertiaMode: e.target.value as 'fixed' | 'linear-decrease',
                        }))
                      }
                      options={[
                        { value: 'fixed', label: 'Fixed (w)' },
                        { value: 'linear-decrease', label: 'Linear (0.9 → 0.4)' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Velocity Clamp (Vmax)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        step={5}
                        value={Math.round((psoConfig.velocityClampRatio ?? 0.2) * 100)}
                        onChange={(e) => {
                          const pct = parseFloat(e.target.value) || 20
                          setPsoConfig((prev) => ({
                            ...prev,
                            velocityClampRatio: Math.max(0.01, pct / 100),
                          }))
                        }}
                      />
                      <span className="text-xs text-muted-foreground font-mono">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                  Random Seed (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 42 (leave blank for random)"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                />
              </div>

              <Button
                variant="default"
                className="w-full font-semibold"
                onClick={applyConfiguration}
                disabled={status === 'running' || (mode === 'custom' && !exprValidation.valid)}
              >
                Apply & Reset Swarm
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Controls, Results, and Live State */}
        <div className="lg:col-span-7 space-y-6">
          {/* Simulation Controls Bar */}
          <SimulationControls
            status={status}
            iteration={iteration}
            maxIterations={maxIterations}
            speed={speed}
            onPlay={play}
            onPause={pause}
            onStep={step}
            onReset={reset}
            onSpeedChange={setSpeed}
          />

          {/* Best Solution Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Best Objective Value
                </span>
                <div className="text-2xl font-bold font-mono text-primary truncate">
                  {currentObjective !== undefined ? currentObjective.toExponential(4) : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Exact: {currentObjective !== undefined ? currentObjective.toFixed(6) : '—'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Convergence Gain
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {improvement}%
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Initial: {initialObjective !== undefined ? initialObjective.toFixed(4) : '—'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Swarm Activity
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {algorithmState?.particles.length || 0}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Particles in {dimensions}D space
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Optimal Coordinates Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Best Coordinates Vector (gbest)</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {dimensions} coordinates
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {algorithmState?.bestPosition ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 text-xs font-mono">
                  {algorithmState.bestPosition.map((coord, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-secondary rounded border border-border flex flex-col"
                    >
                      <span className="text-muted-foreground text-[10px]">x{idx + 1}</span>
                      <span className="font-semibold text-foreground truncate">
                        {coord.toFixed(5)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Swarm not yet initialized.</p>
              )}
            </CardContent>
          </Card>

          {/* Live Swarm Particle Inspector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Swarm Population Sample</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Showing first {Math.min(5, algorithmState?.particles.length || 0)} particles
                </span>
              </CardTitle>
              <CardDescription>
                Live particle coordinates, velocity magnitudes, and personal best values.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {algorithmState?.particles && algorithmState.particles.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Position Sample</th>
                        <th className="py-2 px-2">Velocity Norm</th>
                        <th className="py-2 px-2">Personal Best</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {algorithmState.particles.slice(0, 5).map((p, idx) => {
                        const vNorm = Math.sqrt(
                          p.velocity.reduce((sum, v) => sum + v * v, 0)
                        ).toFixed(4)
                        return (
                          <tr key={idx} className="hover:bg-accent/40">
                            <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                            <td className="py-2 px-2 text-foreground">
                              ({p.position.slice(0, 3).map((v) => v.toFixed(3)).join(', ')}
                              {p.position.length > 3 ? '...' : ''})
                            </td>
                            <td className="py-2 px-2 text-muted-foreground">{vNorm}</td>
                            <td className="py-2 px-2 text-primary font-medium">
                              {p.pbestObjective.toFixed(5)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active particles.</p>
              )}
            </CardContent>
          </Card>

          {/* Interactive Objective Function & Swarm Visualization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>
                  {dimensions === 1 && '1D Function Curve & Swarm Dynamics'}
                  {dimensions === 2 && '2D Objective Landscape (Contour Plot)'}
                  {dimensions === 3 && '3D Parameter Space Distribution'}
                  {dimensions >= 4 && `Multi-Dimensional Projection (${dimensions}D Space)`}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {dimensions}D Optimization
                </span>
              </CardTitle>
              <CardDescription>
                Live particle coordinates and global best (★) tracked directly on the actual mathematical objective surface.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentProblem ? (
                <>
                  {dimensions === 1 && (
                    <CurvePlot
                      bounds={bounds[0] ?? [-5.12, 5.12]}
                      evaluate={currentProblem.evaluate}
                      particles={algorithmState?.particles ?? []}
                      gbest={algorithmState?.bestPosition ?? null}
                    />
                  )}
                  {dimensions === 2 && (
                    <ContourPlot
                      bounds={bounds}
                      evaluate={currentProblem.evaluate}
                      particles={algorithmState?.particles ?? []}
                      gbest={algorithmState?.bestPosition ?? null}
                    />
                  )}
                  {dimensions === 3 && (
                    <SurfacePlot
                      bounds={bounds}
                      evaluate={currentProblem.evaluate}
                      particles={algorithmState?.particles ?? []}
                      gbest={algorithmState?.bestPosition ?? null}
                    />
                  )}
                  {dimensions >= 4 && (
                    <div className="space-y-4">
                      <ProjectionPlot
                        dimensions={dimensions}
                        bounds={bounds}
                        evaluate={currentProblem.evaluate}
                        particles={algorithmState?.particles ?? []}
                        gbest={algorithmState?.bestPosition ?? null}
                      />
                      <VariableTable
                        dimensions={dimensions}
                        bounds={bounds}
                        gbest={algorithmState?.bestPosition ?? null}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-sm text-destructive">
                  Invalid function configuration or expression.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Convergence History Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Optimization Convergence Chart</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {snapshot?.convergenceHistory?.length ?? 0} samples
                </span>
              </CardTitle>
              <CardDescription>
                Historical progress of the best objective value found by the swarm across iterations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConvergenceChart
                history={snapshot?.convergenceHistory ?? []}
                objectiveName={objective === 'minimize' ? 'Min Objective' : 'Max Objective'}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
