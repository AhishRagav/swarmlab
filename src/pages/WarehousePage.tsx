import { useState, useEffect, useMemo, useCallback } from 'react'
import { algorithmRegistry } from '@/registries'
import type { AlgorithmRegistration } from '@/registries/types'
import type { PSOConfig, PSOState } from '@/algorithms/pso/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SimulationControls } from '@/components/SimulationControls'
import { ConvergenceChart, WarehouseCanvas } from '@/visualization'
import { createSimulationStore } from '@/simulation/store'
import {
  createWarehouseProblem,
  generateRandomCustomers,
  analyzeWarehouseSolution,
  DEFAULT_WAREHOUSE_BOUNDS,
  type Customer,
  type WarehouseBounds,
  type CustomerPlacementMode,
} from '@/problems/warehouse'

// Dedicated simulation store for the Warehouse Placement page
const useWarehouseStore = createSimulationStore<PSOState, PSOConfig>()

export default function WarehousePage() {
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
  } = useWarehouseStore()

  // Problem configuration
  const [warehouseCount, setWarehouseCount] = useState<number>(3)
  const [customerCountInput, setCustomerCountInput] = useState<number>(20)
  const [placementMode, setPlacementMode] = useState<CustomerPlacementMode>('random')
  const [bounds, setBounds] = useState<WarehouseBounds>({ ...DEFAULT_WAREHOUSE_BOUNDS })

  // Customer population state (all customers have equal demand = 1)
  const [customers, setCustomers] = useState<Customer[]>(() =>
    generateRandomCustomers(20, DEFAULT_WAREHOUSE_BOUNDS, 42)
  )

  // Manual customer input form
  const [manualX, setManualX] = useState<string>('50')
  const [manualY, setManualY] = useState<string>('50')

  // Particle Inspector state
  const [selectedParticleIdx, setSelectedParticleIdx] = useState<number>(0)
  const [showCurrent, setShowCurrent] = useState<boolean>(true)
  const [showPbest, setShowPbest] = useState<boolean>(true)
  const [showGbest, setShowGbest] = useState<boolean>(true)

  const psoEntry = useMemo(
    () => algorithmRegistry.getOrThrow('pso') as AlgorithmRegistration<PSOState, PSOConfig>,
    []
  )

  // PSO configuration state
  const [psoConfig, setPsoConfig] = useState<PSOConfig>(() => ({
    ...(algorithmRegistry.getOrThrow('pso').defaultConfig as PSOConfig),
    swarmSize: 30,
  }))
  const [maxIters, setMaxIters] = useState<number>(100)
  const [seedInput, setSeedInput] = useState<string>('42')

  // Regenerate random customers
  const handleRegenerateCustomers = useCallback(() => {
    const seed = seedInput.trim() !== '' ? parseInt(seedInput, 10) : undefined
    const newCustomers = generateRandomCustomers(
      customerCountInput,
      bounds,
      seed
    )
    setCustomers(newCustomers)
  }, [customerCountInput, bounds, seedInput])

  // Handle adding customer manually
  const handleAddManualCustomer = () => {
    const x = parseFloat(manualX)
    const y = parseFloat(manualY)

    if (isNaN(x) || isNaN(y)) {
      alert('Please enter valid numeric coordinates.')
      return
    }

    const newCust: Customer = {
      id: `C${customers.length + 1}`,
      x,
      y,
      demand: 1,
    }
    setCustomers((prev) => [...prev, newCust])
  }

  // Handle clicking directly on canvas to place customer in manual mode
  const handleCanvasClick = (world: { x: number; y: number }) => {
    if (placementMode !== 'manual') return
    const newCust: Customer = {
      id: `C${customers.length + 1}`,
      x: world.x,
      y: world.y,
      demand: 1,
    }
    setCustomers((prev) => [...prev, newCust])
  }

  // Handle removing a customer
  const handleRemoveCustomer = (id: string) => {
    if (customers.length <= 1) {
      alert('You must have at least one customer.')
      return
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id))
  }

  // Memoized warehouse problem definition
  const warehouseProblem = useMemo(() => {
    try {
      if (customers.length === 0 || warehouseCount < 1) return null
      return createWarehouseProblem({
        customers,
        warehouseCount,
        bounds,
      })
    } catch {
      return null
    }
  }, [customers, warehouseCount, bounds])

  // Apply configuration to PSO engine
  const applyConfiguration = useCallback(() => {
    if (!warehouseProblem) return
    try {
      const seed = seedInput.trim() !== '' ? parseInt(seedInput, 10) : undefined

      configure(psoEntry.factory, warehouseProblem, psoConfig, {
        maxIterations: maxIters,
        seed: isNaN(seed as number) ? undefined : seed,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error configuring warehouse problem.')
    }
  }, [warehouseProblem, psoEntry.factory, psoConfig, maxIters, seedInput, configure])

  // Initial configure on mount or when problem changes
  useEffect(() => {
    applyConfiguration()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time solution analysis
  const solutionAnalysis = useMemo(() => {
    if (!algorithmState?.bestPosition || algorithmState.bestPosition.length === 0) {
      return null
    }
    return analyzeWarehouseSolution(customers, algorithmState.bestPosition)
  }, [customers, algorithmState])

  // Summary statistics
  const currentCost = algorithmState?.bestObjective
  const initialCost = snapshot?.convergenceHistory[0]?.objectiveValue
  const costReduction =
    initialCost !== undefined && currentCost !== undefined && initialCost > 0
      ? (((initialCost - currentCost) / initialCost) * 100).toFixed(2)
      : '0.00'

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Warehouse Placement Optimizer</h1>
        <p className="text-muted-foreground mt-1">
          Optimize 2D warehouse locations for {customers.length} customer nodes to minimize demand-weighted
          distances using Particle Swarm Optimization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Problem Setup & PSO Parameters */}
        <div className="lg:col-span-5 space-y-6">
          {/* Warehouse & Customer Setup Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Warehouse Problem Configuration</CardTitle>
              <CardDescription>
                Configure warehouse capacity, customer nodes, and demand distribution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Warehouses (K)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={warehouseCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1
                      setWarehouseCount(Math.max(1, Math.min(10, val)))
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Dimensionality: {warehouseCount * 2} variables (2K)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Customers (M)
                  </label>
                  <Input
                    type="number"
                    min={2}
                    max={100}
                    value={customerCountInput}
                    disabled={placementMode === 'manual'}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 5
                      setCustomerCountInput(Math.max(2, Math.min(100, val)))
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Current active: {customers.length}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                  Placement Mode
                </label>
                <Select
                  value={placementMode}
                  onChange={(e) => setPlacementMode(e.target.value as CustomerPlacementMode)}
                  options={[
                    { value: 'random', label: 'Random Placement' },
                    { value: 'manual', label: 'Manual Coordinates' },
                  ]}
                />
              </div>

              {/* Area Bounds */}
              <div className="p-3 bg-secondary/30 rounded-md border border-border space-y-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground block">
                  Search Coordinate Bounds
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-0.5">
                      X Bounds [min, max]
                    </label>
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <Input
                        type="number"
                        value={bounds.minX}
                        onChange={(e) =>
                          setBounds((b) => ({ ...b, minX: parseFloat(e.target.value) || 0 }))
                        }
                      />
                      <span>to</span>
                      <Input
                        type="number"
                        value={bounds.maxX}
                        onChange={(e) =>
                          setBounds((b) => ({ ...b, maxX: parseFloat(e.target.value) || 100 }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-0.5">
                      Y Bounds [min, max]
                    </label>
                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <Input
                        type="number"
                        value={bounds.minY}
                        onChange={(e) =>
                          setBounds((b) => ({ ...b, minY: parseFloat(e.target.value) || 0 }))
                        }
                      />
                      <span>to</span>
                      <Input
                        type="number"
                        value={bounds.maxY}
                        onChange={(e) =>
                          setBounds((b) => ({ ...b, maxY: parseFloat(e.target.value) || 100 }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Actions */}
              {placementMode === 'random' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium"
                  onClick={handleRegenerateCustomers}
                >
                  Regenerate Random Customers
                </Button>
              ) : (
                <div className="p-3 bg-secondary/30 rounded-md border border-border space-y-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground block">
                    Add Manual Customer (X, Y)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="X Coordinate"
                      value={manualX}
                      onChange={(e) => setManualX(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Y Coordinate"
                      value={manualY}
                      onChange={(e) => setManualY(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={handleAddManualCustomer}
                  >
                    Add Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PSO Swarm Parameters Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">PSO Algorithm Parameters</CardTitle>
              <CardDescription>
                Configure swarm behavior, acceleration coefficients, and execution options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                      setPsoConfig((p) => ({
                        ...p,
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
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Inertia (w)
                  </label>
                  <Input
                    type="number"
                    step={0.05}
                    value={psoConfig.w}
                    disabled={psoConfig.inertiaMode === 'linear-decrease'}
                    onChange={(e) =>
                      setPsoConfig((p) => ({ ...p, w: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Cognitive (c1)
                  </label>
                  <Input
                    type="number"
                    step={0.05}
                    value={psoConfig.c1}
                    onChange={(e) =>
                      setPsoConfig((p) => ({ ...p, c1: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                    Social (c2)
                  </label>
                  <Input
                    type="number"
                    step={0.05}
                    value={psoConfig.c2}
                    onChange={(e) =>
                      setPsoConfig((p) => ({ ...p, c2: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              {/* Execution Options */}
              <div className="pt-2 border-t border-border space-y-3">
                <span className="text-xs font-semibold uppercase text-muted-foreground block">
                  Execution Options
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
                        { value: 'zero', label: 'Zero' },
                        { value: 'random', label: 'Random (±10%)' },
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
                        { value: 'clipping', label: 'Position Clipping' },
                        { value: 'absorb', label: 'Absorb (Zero V)' },
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
                  placeholder="e.g. 42"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                />
              </div>

              <Button
                variant="default"
                className="w-full font-semibold"
                onClick={applyConfiguration}
                disabled={status === 'running' || !warehouseProblem}
              >
                Apply & Reset Swarm
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Controls, Results, and Analysis */}
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

          {/* Solution Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Total Cost (Distance)
                </span>
                <div className="text-2xl font-bold font-mono text-primary truncate">
                  {currentCost !== undefined ? currentCost.toFixed(2) : '—'}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Total Nearest-Distance F
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Cost Reduction
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {costReduction}%
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Initial: {initialCost !== undefined ? initialCost.toFixed(2) : '—'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Network Scale
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {warehouseCount} Wh / {customers.length} Cust
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {psoConfig.swarmSize} particles ({warehouseCount * 2}D)
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive 2D Warehouse Spatial Map */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Interactive 2D Spatial Warehouse Map</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {placementMode === 'manual' ? 'Click canvas to add customer' : 'Hover over nodes for details'}
                </span>
              </CardTitle>
              <CardDescription>
                Visual representation of {customers.length} customer nodes, {warehouseCount} warehouse locations, and nearest assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WarehouseCanvas
                customers={customers}
                solution={solutionAnalysis}
                bounds={bounds}
                particles={algorithmState?.particles}
                selectedParticleIndex={selectedParticleIdx}
                showCurrent={showCurrent}
                showPbest={showPbest}
                showGbest={showGbest}
                onCanvasClick={placementMode === 'manual' ? handleCanvasClick : undefined}
              />
            </CardContent>
          </Card>

          {/* Particle Inspector (Current, Pbest, Gbest) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Particle Inspector (PSO State Explorer)</CardTitle>
                  <CardDescription>
                    Inspect live Current Position, Personal Best (Pbest), and Global Best (Gbest) for any swarm particle.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Particle:
                  </span>
                  <Select
                    value={String(selectedParticleIdx)}
                    onChange={(e) => setSelectedParticleIdx(parseInt(e.target.value, 10) || 0)}
                    className="w-36 h-8 text-xs font-mono"
                    options={Array.from(
                      { length: algorithmState?.particles?.length ?? psoConfig.swarmSize },
                      (_, i) => ({
                        value: String(i),
                        label: `Particle ${i + 1}`,
                      })
                    )}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Fitness Comparison Metrics & Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Current Position (Grey) */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    showCurrent ? 'bg-secondary/40 border-[#71717a]' : 'bg-secondary/15 border-border opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#a1a1aa] flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#52525b] border border-[#a1a1aa]" />
                      Current Position
                    </span>
                    <Button
                      size="sm"
                      variant={showCurrent ? 'default' : 'outline'}
                      className="h-6 text-[10px] px-2"
                      onClick={() => setShowCurrent((v) => !v)}
                    >
                      {showCurrent ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>
                  <div className="text-xl font-bold font-mono text-foreground">
                    {algorithmState?.particles?.[selectedParticleIdx]?.currentFitness !== undefined
                      ? algorithmState.particles[selectedParticleIdx].currentFitness.toFixed(2)
                      : '—'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Particle {selectedParticleIdx + 1} Current Fitness
                  </div>
                </div>

                {/* Personal Best Pbest (Blue) */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    showPbest ? 'bg-blue-500/10 border-blue-500/50' : 'bg-secondary/15 border-border opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#2563eb] border border-[#93c5fd]" />
                      Personal Best (Pbest)
                    </span>
                    <Button
                      size="sm"
                      variant={showPbest ? 'default' : 'outline'}
                      className="h-6 text-[10px] px-2"
                      onClick={() => setShowPbest((v) => !v)}
                    >
                      {showPbest ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>
                  <div className="text-xl font-bold font-mono text-blue-400">
                    {algorithmState?.particles?.[selectedParticleIdx]?.pbestFitness !== undefined &&
                    algorithmState.particles[selectedParticleIdx].pbestFitness < Infinity
                      ? algorithmState.particles[selectedParticleIdx].pbestFitness.toFixed(2)
                      : '—'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Particle {selectedParticleIdx + 1} Best Fitness
                  </div>
                </div>

                {/* Global Best Gbest (Amber) */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    showGbest ? 'bg-amber-500/10 border-amber-500/50' : 'bg-secondary/15 border-border opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] border border-white" />
                      Global Best (Gbest)
                    </span>
                    <Button
                      size="sm"
                      variant={showGbest ? 'default' : 'outline'}
                      className="h-6 text-[10px] px-2"
                      onClick={() => setShowGbest((v) => !v)}
                    >
                      {showGbest ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>
                  <div className="text-xl font-bold font-mono text-primary">
                    {algorithmState?.bestFitness !== undefined && algorithmState.bestFitness < Infinity
                      ? algorithmState.bestFitness.toFixed(2)
                      : '—'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Swarm Global Minimum
                  </div>
                </div>
              </div>

              {/* Warehouse Coordinates Breakdown for Selected Particle */}
              {algorithmState?.particles?.[selectedParticleIdx] ? (
                <div className="border border-border rounded-md overflow-hidden text-xs">
                  <div className="bg-secondary/60 px-3 py-2 font-semibold text-muted-foreground grid grid-cols-4 border-b border-border text-[11px] uppercase tracking-wider">
                    <span>Warehouse</span>
                    <span>Current (Grey)</span>
                    <span>Pbest (Blue)</span>
                    <span>Gbest (Amber)</span>
                  </div>
                  <div className="divide-y divide-border/60 font-mono">
                    {Array.from({ length: warehouseCount }, (_, whIdx) => {
                      const curX = algorithmState.particles[selectedParticleIdx].position[2 * whIdx]
                      const curY = algorithmState.particles[selectedParticleIdx].position[2 * whIdx + 1]
                      const pbX = algorithmState.particles[selectedParticleIdx].pbestPosition[2 * whIdx]
                      const pbY = algorithmState.particles[selectedParticleIdx].pbestPosition[2 * whIdx + 1]
                      const gbX = algorithmState.bestPosition[2 * whIdx]
                      const gbY = algorithmState.bestPosition[2 * whIdx + 1]

                      return (
                        <div
                          key={whIdx}
                          className="px-3 py-2 grid grid-cols-4 items-center hover:bg-secondary/30 transition-colors"
                        >
                          <span className="font-sans font-medium text-foreground">
                            Warehouse #{whIdx + 1}
                          </span>
                          <span className="text-[#a1a1aa]">
                            {curX !== undefined && curY !== undefined
                              ? `(${curX.toFixed(1)}, ${curY.toFixed(1)})`
                              : '—'}
                          </span>
                          <span className="text-blue-400">
                            {pbX !== undefined && pbY !== undefined
                              ? `(${pbX.toFixed(1)}, ${pbY.toFixed(1)})`
                              : '—'}
                          </span>
                          <span className="text-primary font-semibold">
                            {gbX !== undefined && gbY !== undefined
                              ? `(${gbX.toFixed(1)}, ${gbY.toFixed(1)})`
                              : '—'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border rounded">
                  Simulation not yet initialized. Press Play or Step to inspect live particle states.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optimized Warehouse Locations Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Optimized Warehouse Coordinates (gbest)</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {warehouseCount} Warehouses
                </span>
              </CardTitle>
              <CardDescription>
                Current best positions and customer allocation summary.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {solutionAnalysis ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {solutionAnalysis.warehouses.map((wh) => (
                    <div
                      key={wh.index}
                      className="p-3 bg-secondary/40 rounded-lg border border-border space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          Warehouse #{wh.index + 1}
                        </span>
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">
                          {wh.assignedCustomers} customers
                        </span>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        Coords: ({wh.x.toFixed(2)}, {wh.y.toFixed(2)})
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Customers Served: <span className="font-semibold text-foreground font-mono">{wh.assignedCustomers}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Swarm not yet initialized.</p>
              )}
            </CardContent>
          </Card>

          {/* Convergence History Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Warehouse Cost Convergence</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {snapshot?.convergenceHistory?.length ?? 0} iterations
                </span>
              </CardTitle>
              <CardDescription>
                Progress of the minimal total transportation distance found by the swarm.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConvergenceChart
                history={snapshot?.convergenceHistory ?? []}
                objectiveName="Total Distance"
              />
            </CardContent>
          </Card>

          {/* Customer Assignment Table Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Customer Assignment & Distance Breakdown</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Showing {customers.length} customer nodes
                </span>
              </CardTitle>
              <CardDescription>
                Detailed customer locations, nearest warehouse assignment, and transport distances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {solutionAnalysis ? (
                <div className="max-h-72 overflow-y-auto border border-border rounded-md">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-secondary/60 text-muted-foreground sticky top-0 font-medium">
                      <tr>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3">Location (X, Y)</th>
                        <th className="py-2 px-3">Demand</th>
                        <th className="py-2 px-3">Assigned Warehouse</th>
                        <th className="py-2 px-3">Distance (Cost)</th>
                        {placementMode === 'manual' && <th className="py-2 px-3">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {solutionAnalysis.assignments.map((asgn) => (
                        <tr key={asgn.customerId} className="hover:bg-accent/30">
                          <td className="py-1.5 px-3 font-semibold text-foreground">
                            {asgn.customerId}
                          </td>
                          <td className="py-1.5 px-3 text-muted-foreground">
                            ({asgn.customerX.toFixed(1)}, {asgn.customerY.toFixed(1)})
                          </td>
                          <td className="py-1.5 px-3 text-foreground">{asgn.demand}</td>
                          <td className="py-1.5 px-3 font-semibold text-primary">
                            Warehouse #{asgn.nearestWarehouseIndex + 1}
                          </td>
                          <td className="py-1.5 px-3 font-medium text-foreground">
                            {asgn.distance.toFixed(2)}
                          </td>
                          {placementMode === 'manual' && (
                            <td className="py-1.5 px-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveCustomer(asgn.customerId)}
                              >
                                Delete
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No customer assignment data available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
