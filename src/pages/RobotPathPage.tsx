import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MousePointer,
  SquarePlus,
  MapPin,
  Flag,
  Trash2,
  Shuffle,
  Bot,
  Square,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SimulationControls } from '@/components/SimulationControls'
import { ConvergenceChart } from '@/visualization/shared/ConvergenceChart'
import {
  type CanvasInteractionMode,
  RobotPathCanvas,
} from '@/visualization/robot-path'
import { SimulationExplanationPanel } from '@/components/SimulationExplanationPanel'
import {
  createRobotPathProblem,
  DEFAULT_ENVIRONMENT_CONFIG,
  extractPathPoints,
  generateRandomObstacles,
  robotPathPSOFactory,
  validateEnvironment,
  type EnvironmentConfig,
  type Obstacle,
  type Point2D,
  type RobotPathPSOConfig,
  type RobotPathPSOState,
} from '@/problems/robot-path'
import { createSimulationStore } from '@/simulation/store'

// Dedicated simulation store for Robot Path Planning page
const useRobotPathStore = createSimulationStore<RobotPathPSOState, RobotPathPSOConfig>()

export default function RobotPathPage() {
  const {
    status,
    iteration,
    speed,
    algorithmState,
    maxIterations,
    convergenceHistory,
    lastAction,
    gbestImproved,
    configure,
    play,
    pause,
    step,
    reset,
    setSpeed,
  } = useRobotPathStore()

  // Environment State
  const [environment, setEnvironment] = useState<EnvironmentConfig>(DEFAULT_ENVIRONMENT_CONFIG)
  const [interactionMode, setInteractionMode] = useState<CanvasInteractionMode>('select')
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null)

  // PSO Parameters
  const [swarmSize, setSwarmSize] = useState<number>(30)
  const [maxIterInput, setMaxIterInput] = useState<number>(100)
  const [w, setW] = useState<number>(0.7)
  const [c1, setC1] = useState<number>(1.5)
  const [c2, setC2] = useState<number>(1.5)
  const [clampRatio, setClampRatio] = useState<number>(0.2)
  const [initialVelocityMode, setInitialVelocityMode] = useState<'zero' | 'random'>('zero')
  const [inertiaMode, setInertiaMode] = useState<'fixed' | 'linear-decrease'>('fixed')
  const [seed, setSeed] = useState<number>(42)

  // Robot Animation State
  const [isAnimating, setIsAnimating] = useState(false)
  const [animSpeed, setAnimSpeed] = useState<number>(1)
  const [robotPosition, setRobotPosition] = useState<Point2D | null>(null)
  const [robotHeading, setRobotHeading] = useState<number>(0)
  const animationFrameRef = useRef<number | null>(null)

  // Particle Inspector State
  const [selectedParticleIdx, setSelectedParticleIdx] = useState<number>(0)
  const [showCurrent, setShowCurrent] = useState<boolean>(true)
  const [showPbest, setShowPbest] = useState<boolean>(true)
  const [showGbest, setShowGbest] = useState<boolean>(true)

  // Environment validation
  const envValidation = useMemo(() => validateEnvironment(environment), [environment])

  // Stop robot animation
  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setIsAnimating(false)
    setRobotPosition(null)
  }, [])

  // Configure or reconfigure simulation
  const setupSimulation = useCallback(() => {
    if (!envValidation.isValid) return

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    const problem = createRobotPathProblem(environment)
    const psoConfig: RobotPathPSOConfig = {
      swarmSize,
      w,
      c1,
      c2,
      intermediateWaypoints: environment.intermediateWaypoints,
      smoothnessWeight: environment.smoothnessWeight,
      velocityClampRatio: clampRatio,
      initialVelocityMode,
      inertiaMode,
      environment,
    }

    configure(robotPathPSOFactory, problem, psoConfig, {
      maxIterations: maxIterInput,
      seed,
    })
  }, [
    envValidation.isValid,
    environment,
    swarmSize,
    w,
    c1,
    c2,
    clampRatio,
    initialVelocityMode,
    inertiaMode,
    maxIterInput,
    seed,
    configure,
  ])

  // Setup on mount and when settings change
  useEffect(() => {
    setupSimulation()
  }, [setupSimulation])

  // Extract global best path
  const globalBestPath = useMemo(() => {
    if (
      algorithmState?.hasFeasibleSolution &&
      algorithmState.bestPosition &&
      algorithmState.bestPosition.length > 0
    ) {
      return extractPathPoints(
        algorithmState.bestPosition,
        environment.start,
        environment.goal
      )
    }
    return []
  }, [algorithmState, environment.start, environment.goal])

  // Extract candidate paths
  const candidatePaths = useMemo(() => {
    if (!algorithmState?.particles) return []
    return algorithmState.particles
      .filter((p) => p.isFeasible)
      .map((p) => extractPathPoints(p.position, environment.start, environment.goal))
  }, [algorithmState, environment.start, environment.goal])

  // Selected particle for inspector
  const selectedParticle = useMemo(() => {
    if (!algorithmState?.particles || algorithmState.particles.length === 0) return null
    const safeIdx = Math.min(selectedParticleIdx, algorithmState.particles.length - 1)
    return algorithmState.particles[safeIdx] ?? null
  }, [algorithmState, selectedParticleIdx])

  // Extract selected particle's current path (strict feasibility check)
  const selectedCurrentPath = useMemo(() => {
    if (!selectedParticle || !selectedParticle.isFeasible || !selectedParticle.position) return []
    return extractPathPoints(selectedParticle.position, environment.start, environment.goal)
  }, [selectedParticle, environment.start, environment.goal])

  // Extract selected particle's personal best (Pbest) path (strict feasibility check)
  const selectedPbestPath = useMemo(() => {
    if (
      !selectedParticle ||
      selectedParticle.pbestFitness === Infinity ||
      !selectedParticle.pbestPosition ||
      selectedParticle.pbestPosition.length === 0
    ) {
      return []
    }
    return extractPathPoints(selectedParticle.pbestPosition, environment.start, environment.goal)
  }, [selectedParticle, environment.start, environment.goal])

  // Obstacle management
  const handleAddObstacle = useCallback((newObs: Omit<Obstacle, 'id'>) => {
    stopAnimation()
    setEnvironment((prev) => {
      const id = `OBS-${prev.obstacles.length + 1}`
      return {
        ...prev,
        obstacles: [...prev.obstacles, { ...newObs, id }],
      }
    })
  }, [stopAnimation])

  const handleUpdateObstacle = useCallback((updatedObs: Obstacle) => {
    stopAnimation()
    setEnvironment((prev) => ({
      ...prev,
      obstacles: prev.obstacles.map((o) => (o.id === updatedObs.id ? updatedObs : o)),
    }))
  }, [stopAnimation])

  const handleDeleteObstacle = useCallback((id: string) => {
    stopAnimation()
    setEnvironment((prev) => ({
      ...prev,
      obstacles: prev.obstacles.filter((o) => o.id !== id),
    }))
    setSelectedObstacleId((prev) => (prev === id ? null : prev))
  }, [stopAnimation])

  const handleClearObstacles = useCallback(() => {
    stopAnimation()
    setEnvironment((prev) => ({
      ...prev,
      obstacles: [],
    }))
    setSelectedObstacleId(null)
  }, [stopAnimation])

  const handleGenerateRandomObstacles = useCallback(() => {
    stopAnimation()
    const randomSeed = Math.floor(Math.random() * 100000)
    const newObstacles = generateRandomObstacles(
      4,
      {
        mapWidth: environment.mapWidth,
        mapHeight: environment.mapHeight,
        start: environment.start,
        goal: environment.goal,
      },
      randomSeed
    )

    setEnvironment((prev) => ({
      ...prev,
      obstacles: newObstacles,
    }))
    setSelectedObstacleId(null)
  }, [environment.mapWidth, environment.mapHeight, environment.start, environment.goal, stopAnimation])

  const handleSetStart = useCallback((point: Point2D) => {
    stopAnimation()
    setEnvironment((prev) => ({
      ...prev,
      start: point,
    }))
  }, [stopAnimation])

  const handleSetGoal = useCallback((point: Point2D) => {
    stopAnimation()
    setEnvironment((prev) => ({
      ...prev,
      goal: point,
    }))
  }, [stopAnimation])

  // Robot Animation Along Validated Global Best Path
  const handleStartAnimation = useCallback(() => {
    if (globalBestPath.length < 2 || isAnimating || status === 'running') return

    setIsAnimating(true)
    let segmentIndex = 0
    let t = 0 // Segment interpolation progress in [0, 1]

    const stepAnimation = () => {
      if (segmentIndex >= globalBestPath.length - 1) {
        // Reached destination
        setRobotPosition(globalBestPath[globalBestPath.length - 1])
        setIsAnimating(false)
        animationFrameRef.current = null
        return
      }

      const p1 = globalBestPath[segmentIndex]
      const p2 = globalBestPath[segmentIndex + 1]

      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const segLen = Math.hypot(dx, dy)
      const heading = Math.atan2(dy, dx)
      setRobotHeading(heading)

      // Speed scale
      const stepIncrement = Math.max(0.005, (animSpeed * 1.8) / Math.max(1, segLen))
      t += stepIncrement

      if (t >= 1) {
        t = 0
        segmentIndex++
        if (segmentIndex >= globalBestPath.length - 1) {
          setRobotPosition(globalBestPath[globalBestPath.length - 1])
          setIsAnimating(false)
          animationFrameRef.current = null
          return
        }
      }

      const curP1 = globalBestPath[segmentIndex]
      const curP2 = globalBestPath[segmentIndex + 1]
      const curPos: Point2D = {
        x: curP1.x + t * (curP2.x - curP1.x),
        y: curP1.y + t * (curP2.y - curP1.y),
      }

      setRobotPosition(curPos)
      animationFrameRef.current = requestAnimationFrame(stepAnimation)
    }

    animationFrameRef.current = requestAnimationFrame(stepAnimation)
  }, [globalBestPath, isAnimating, status, animSpeed])

  const selectedObs = useMemo(
    () => environment.obstacles.find((o) => o.id === selectedObstacleId) ?? null,
    [environment.obstacles, selectedObstacleId]
  )

  return (
    <div className="space-y-6">
      {/* Page Title & Mission */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Robot Path Planning Optimizer</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Finds a short, smooth, and collision-free path for an autonomous robot using Particle Swarm
          Optimization with strict feasibility rejection and bounded recovery.
        </p>
      </div>

      {/* Environment Validation Errors Banner */}
      {!envValidation.isValid && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-sm text-destructive-foreground space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-destructive">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <span>Invalid Environment Configuration:</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {envValidation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Grid: Visual Canvas & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Canvas & Simulation Controls */}
        <div className="lg:col-span-8 space-y-4">
          {/* Interaction Mode Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                Tool:
              </span>
              <Button
                size="sm"
                variant={interactionMode === 'select' ? 'default' : 'outline'}
                onClick={() => setInteractionMode('select')}
                disabled={status === 'running'}
                title="Select, move, or resize obstacles"
              >
                <MousePointer className="w-3.5 h-3.5 mr-1" />
                Select / Move
              </Button>
              <Button
                size="sm"
                variant={interactionMode === 'add-obstacle' ? 'default' : 'outline'}
                onClick={() => setInteractionMode('add-obstacle')}
                disabled={status === 'running'}
                title="Click and drag on canvas to draw a new obstacle"
              >
                <SquarePlus className="w-3.5 h-3.5 mr-1" />
                Draw Obstacle
              </Button>
              <Button
                size="sm"
                variant={interactionMode === 'set-start' ? 'default' : 'outline'}
                onClick={() => setInteractionMode('set-start')}
                disabled={status === 'running'}
                title="Click on canvas to reposition Start"
              >
                <MapPin className="w-3.5 h-3.5 mr-1" />
                Set Start
              </Button>
              <Button
                size="sm"
                variant={interactionMode === 'set-goal' ? 'default' : 'outline'}
                onClick={() => setInteractionMode('set-goal')}
                disabled={status === 'running'}
                title="Click on canvas to reposition Goal"
              >
                <Flag className="w-3.5 h-3.5 mr-1" />
                Set Goal
              </Button>
              <Button
                size="sm"
                variant={interactionMode === 'delete-obstacle' ? 'default' : 'outline'}
                onClick={() => setInteractionMode('delete-obstacle')}
                disabled={status === 'running'}
                title="Click on any obstacle to delete it"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete Tool
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateRandomObstacles}
                disabled={status === 'running'}
              >
                <Shuffle className="w-3.5 h-3.5 mr-1" />
                Random Map
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearObstacles}
                disabled={status === 'running' || environment.obstacles.length === 0}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <RobotPathCanvas
            environment={environment}
            selectedObstacleId={selectedObstacleId}
            interactionMode={interactionMode}
            candidatePaths={candidatePaths}
            currentPath={selectedCurrentPath}
            pbestPath={selectedPbestPath}
            globalBestPath={globalBestPath}
            showCurrent={showCurrent}
            showPbest={showPbest}
            showGbest={showGbest}
            robotPosition={robotPosition}
            robotHeading={robotHeading}
            isSimulating={status === 'running'}
            onSelectObstacle={setSelectedObstacleId}
            onUpdateObstacle={handleUpdateObstacle}
            onAddObstacle={handleAddObstacle}
            onDeleteObstacle={handleDeleteObstacle}
            onSetStart={handleSetStart}
            onSetGoal={handleSetGoal}
          />

          {/* Simulation Controls Bar */}
          <SimulationControls
            status={status}
            iteration={iteration}
            maxIterations={maxIterations}
            speed={speed}
            onPlay={() => {
              stopAnimation()
              play()
            }}
            onPause={pause}
            onStep={() => {
              stopAnimation()
              step()
            }}
            onReset={() => {
              stopAnimation()
              reset()
            }}
            onSpeedChange={setSpeed}
          />

          {/* Live Step Explanation Panel */}
          <SimulationExplanationPanel
            problemType="robot-path"
            status={status}
            iteration={iteration}
            maxIterations={maxIterations}
            lastAction={lastAction}
            gbestImproved={gbestImproved}
            extraState={{
              recoveryOccurred: (algorithmState?.recoveryAttemptsCount ?? 0) > 0,
              hasFeasibleSolution: algorithmState?.hasFeasibleSolution,
              validParticlesCount: algorithmState?.validParticlesCount,
            }}
          />

          {/* Robot Animation Controller */}
          <div className="flex items-center justify-between p-3.5 bg-card border border-border rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant={isAnimating ? 'destructive' : 'default'}
                onClick={() => {
                  if (isAnimating) {
                    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
                    animationFrameRef.current = null
                    setIsAnimating(false)
                    setRobotPosition(null)
                  } else {
                    handleStartAnimation()
                  }
                }}
                disabled={globalBestPath.length < 2 || status === 'running'}
              >
                {isAnimating ? (
                  <>
                    <Square className="w-3.5 h-3.5 mr-1.5" /> Stop Animation
                  </>
                ) : (
                  <>
                    <Bot className="w-3.5 h-3.5 mr-1.5" /> Animate Robot
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                {globalBestPath.length >= 2
                  ? isAnimating
                    ? 'Robot traveling along collision-free trajectory...'
                    : 'Feasible path ready for physical robot tracking.'
                  : 'Run PSO to find a collision-free path before animating.'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Speed:</span>
              <Select
                value={String(animSpeed)}
                onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
                className="w-20 h-8 text-xs"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1.0x</option>
                <option value="2">2.0x</option>
                <option value="3">3.0x</option>
              </Select>
            </div>
          </div>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-medium">Path Length (L)</div>
              <div className="text-2xl font-bold font-mono text-primary">
                {algorithmState?.hasFeasibleSolution && algorithmState.bestLength < Infinity
                  ? `${algorithmState.bestLength.toFixed(2)} m`
                  : '—'}
              </div>
            </Card>

            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-medium">Best Fitness (F)</div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {algorithmState?.hasFeasibleSolution && algorithmState.bestFitness < Infinity
                  ? algorithmState.bestFitness.toFixed(2)
                  : '—'}
              </div>
            </Card>

            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-medium">Feasible Swarm</div>
              <div className="text-2xl font-bold font-mono text-emerald-500">
                {algorithmState ? `${algorithmState.validParticlesCount} / ${swarmSize}` : '—'}
              </div>
            </Card>

            <Card className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-medium">Rejected / Recovered</div>
              <div className="text-2xl font-bold font-mono text-amber-500">
                {algorithmState
                  ? `${algorithmState.rejectedCandidatesCount} / ${algorithmState.successfulRecoveriesCount}`
                  : '—'}
              </div>
            </Card>
          </div>

          {/* Particle Inspector (Current, Pbest, Gbest) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Particle Inspector (PSO Path Explorer)</CardTitle>
                  <CardDescription>
                    Inspect live Current Position, Personal Best (Pbest), and Global Best (Gbest) paths for any swarm particle.
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
                      { length: algorithmState?.particles?.length ?? swarmSize },
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
                  {selectedParticle?.isFeasible &&
                  selectedParticle.currentFitness !== undefined &&
                  selectedParticle.currentFitness < Infinity ? (
                    <div>
                      <div className="text-xl font-bold font-mono text-foreground">
                        {selectedParticle.currentFitness.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        L: {selectedParticle.currentLength?.toFixed(1) ?? '—'}m | S:{' '}
                        {selectedParticle.currentSmoothness?.toFixed(2) ?? '—'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-destructive py-1">
                        No feasible path
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Candidate collides with obstacle
                      </div>
                    </div>
                  )}
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
                  {selectedParticle &&
                  selectedParticle.pbestFitness !== undefined &&
                  selectedParticle.pbestFitness < Infinity ? (
                    <div>
                      <div className="text-xl font-bold font-mono text-blue-400">
                        {selectedParticle.pbestFitness.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        L: {selectedParticle.pbestLength?.toFixed(1) ?? '—'}m | S:{' '}
                        {selectedParticle.pbestSmoothness?.toFixed(2) ?? '—'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground py-1">
                        No feasible path
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        No collision-free pbest yet
                      </div>
                    </div>
                  )}
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
                  {algorithmState?.hasFeasibleSolution &&
                  algorithmState.bestFitness !== undefined &&
                  algorithmState.bestFitness < Infinity ? (
                    <div>
                      <div className="text-xl font-bold font-mono text-primary">
                        {algorithmState.bestFitness.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        L: {algorithmState.bestLength?.toFixed(1) ?? '—'}m | S:{' '}
                        {algorithmState.bestSmoothness?.toFixed(2) ?? '—'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-muted-foreground py-1">
                        No feasible path
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Swarm searching for corridor...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No Feasible Path Notice */}
          {algorithmState && !algorithmState.hasFeasibleSolution && iteration > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600 dark:text-amber-400 space-y-1">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>No feasible path found with the current search settings.</span>
              </div>
              <p>
                All candidate paths encountered obstacles. Consider increasing intermediate waypoints, enlarging
                the swarm size, adjusting maximum iterations, or relaxing narrow obstacle corridors.
              </p>
            </div>
          )}

          {/* Swarm Initialization Diagnostics Card */}
          {algorithmState?.initDiagnostics && (
            <Card className="border-border">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span>Initialization Results</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        algorithmState.initDiagnostics.status === 'feasible'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          : 'bg-destructive/10 text-destructive border border-destructive/30'
                      }`}
                    >
                      {algorithmState.initDiagnostics.status === 'feasible' ? 'FEASIBLE' : 'INFEASIBLE'}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Harmonic lateral corridor sampling across initial swarm candidates.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-secondary/30 border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Requested</span>
                    <span className="font-mono font-semibold text-foreground text-sm">
                      {algorithmState.initDiagnostics.particlesRequested}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-secondary/30 border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Valid Particles</span>
                    <span className="font-mono font-semibold text-emerald-500 text-sm">
                      {algorithmState.initDiagnostics.feasibleParticlesCount}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-secondary/30 border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Rejected Candidates</span>
                    <span className="font-mono font-semibold text-amber-500 text-sm">
                      {algorithmState.initDiagnostics.rejectedCandidatesCount}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-secondary/30 border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-medium">Total Attempts</span>
                    <span className="font-mono font-semibold text-foreground text-sm">
                      {algorithmState.initDiagnostics.totalAttempts}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Real-time Convergence Chart */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold">Convergence History (Best Feasible Fitness)</CardTitle>
              <CardDescription className="text-xs">
                Tracks minimization of the demand-free robot path objective function across iterations.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ConvergenceChart
                history={convergenceHistory}
                objectiveName="Best Feasible Fitness"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Parameters and Configuration Panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* Environment Configuration Card */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base font-semibold">Environment Settings</CardTitle>
              <CardDescription className="text-xs">
                Configure 2D map dimensions, endpoints, and trajectory resolution.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Map Width (m)</label>
                  <Input
                    type="number"
                    value={environment.mapWidth}
                    disabled={status === 'running'}
                    onChange={(e) => {
                      stopAnimation()
                      setEnvironment((prev) => ({
                        ...prev,
                        mapWidth: Math.max(20, Math.min(500, parseFloat(e.target.value) || 100)),
                      }))
                    }}
                    min={20}
                    max={500}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Map Height (m)</label>
                  <Input
                    type="number"
                    value={environment.mapHeight}
                    disabled={status === 'running'}
                    onChange={(e) => {
                      stopAnimation()
                      setEnvironment((prev) => ({
                        ...prev,
                        mapHeight: Math.max(20, Math.min(500, parseFloat(e.target.value) || 100)),
                      }))
                    }}
                    min={20}
                    max={500}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Start & Goal Coordinates */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                <div>
                  <label className="text-xs font-medium text-emerald-500 block mb-1">Start (X, Y)</label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      value={environment.start.x}
                      disabled={status === 'running'}
                      onChange={(e) =>
                        handleSetStart({ ...environment.start, x: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 text-xs font-mono"
                    />
                    <Input
                      type="number"
                      value={environment.start.y}
                      disabled={status === 'running'}
                      onChange={(e) =>
                        handleSetStart({ ...environment.start, y: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-destructive block mb-1">Goal (X, Y)</label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      value={environment.goal.x}
                      disabled={status === 'running'}
                      onChange={(e) =>
                        handleSetGoal({ ...environment.goal, x: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 text-xs font-mono"
                    />
                    <Input
                      type="number"
                      value={environment.goal.y}
                      disabled={status === 'running'}
                      onChange={(e) =>
                        handleSetGoal({ ...environment.goal, y: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Waypoints & Smoothness Weight */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Waypoints (K)</label>
                  <Input
                    type="number"
                    value={environment.intermediateWaypoints}
                    disabled={status === 'running'}
                    onChange={(e) => {
                      stopAnimation()
                      setEnvironment((prev) => ({
                        ...prev,
                        intermediateWaypoints: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)),
                      }))
                    }}
                    min={1}
                    max={20}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Smoothness Weight (λ)</label>
                  <Input
                    type="number"
                    value={environment.smoothnessWeight}
                    disabled={status === 'running'}
                    step={0.1}
                    onChange={(e) => {
                      stopAnimation()
                      setEnvironment((prev) => ({
                        ...prev,
                        smoothnessWeight: Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)),
                      }))
                    }}
                    min={0}
                    max={10}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Obstacle Editor Card */}
          <Card>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  {selectedObs ? `Edit ${selectedObs.id}` : 'Obstacle Inspector'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedObs
                    ? 'Modify coordinates and dimensions directly.'
                    : 'Click an obstacle on the canvas to inspect.'}
                </CardDescription>
              </div>
              {selectedObs && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteObstacle(selectedObs.id)}
                  disabled={status === 'running'}
                  className="h-7 text-xs"
                >
                  Delete
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {selectedObs ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">X Position</label>
                    <Input
                      type="number"
                      value={selectedObs.x}
                      disabled={status === 'running'}
                      onChange={(e) =>
                        handleUpdateObstacle({ ...selectedObs, x: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Y Position</label>
                    <Input
                      type="number"
                      value={selectedObs.y}
                      disabled={status === 'running'}
                      onChange={(e) =>
                        handleUpdateObstacle({ ...selectedObs, y: parseFloat(e.target.value) || 0 })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Width (m)</label>
                    <Input
                      type="number"
                      value={selectedObs.width}
                      disabled={status === 'running'}
                      onChange={(e) =>
                        handleUpdateObstacle({
                          ...selectedObs,
                          width: Math.max(2, parseFloat(e.target.value) || 2),
                        })
                      }
                      min={2}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Height (m)</label>
                    <Input
                      type="number"
                      value={selectedObs.height}
                      disabled={status === 'running'}
                      onChange={(e) =>
                        handleUpdateObstacle({
                          ...selectedObs,
                          height: Math.max(2, parseFloat(e.target.value) || 2),
                        })
                      }
                      min={2}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-4 bg-secondary/30 rounded border border-dashed border-border">
                  {environment.obstacles.length === 0
                    ? 'No obstacles present on the map.'
                    : `${environment.obstacles.length} obstacles on map. Click one to edit.`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* PSO Optimization Parameters Card */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base font-semibold">PSO Parameters</CardTitle>
              <CardDescription className="text-xs">
                Configure hyperparameters for swarm intelligence navigation.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Swarm Size</label>
                  <Input
                    type="number"
                    value={swarmSize}
                    disabled={status === 'running'}
                    onChange={(e) => setSwarmSize(Math.max(5, Math.min(100, parseInt(e.target.value) || 30)))}
                    min={5}
                    max={100}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Max Iterations</label>
                  <Input
                    type="number"
                    value={maxIterInput}
                    disabled={status === 'running'}
                    onChange={(e) =>
                      setMaxIterInput(Math.max(10, Math.min(1000, parseInt(e.target.value) || 100)))
                    }
                    min={10}
                    max={1000}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Inertia (w)</label>
                  <Input
                    type="number"
                    value={w}
                    disabled={status === 'running'}
                    step={0.05}
                    onChange={(e) => setW(Math.max(0, Math.min(1.5, parseFloat(e.target.value) || 0.7)))}
                    min={0}
                    max={1.5}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Cognitive (c1)</label>
                  <Input
                    type="number"
                    value={c1}
                    disabled={status === 'running'}
                    step={0.1}
                    onChange={(e) => setC1(Math.max(0, Math.min(3, parseFloat(e.target.value) || 1.5)))}
                    min={0}
                    max={3}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Social (c2)</label>
                  <Input
                    type="number"
                    value={c2}
                    disabled={status === 'running'}
                    step={0.1}
                    onChange={(e) => setC2(Math.max(0, Math.min(3, parseFloat(e.target.value) || 1.5)))}
                    min={0}
                    max={3}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Initial Velocity</label>
                  <Select
                    value={initialVelocityMode}
                    disabled={status === 'running'}
                    onChange={(e) => setInitialVelocityMode(e.target.value as 'zero' | 'random')}
                    className="h-8 text-xs"
                  >
                    <option value="zero">Zero</option>
                    <option value="random">Random (±10%)</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Inertia Schedule</label>
                  <Select
                    value={inertiaMode}
                    disabled={status === 'running'}
                    onChange={(e) => setInertiaMode(e.target.value as 'fixed' | 'linear-decrease')}
                    className="h-8 text-xs"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="linear-decrease">Linear Decrease</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Velocity Clamp (Vmax)</label>
                  <Input
                    type="number"
                    value={clampRatio}
                    disabled={status === 'running'}
                    step={0.05}
                    onChange={(e) =>
                      setClampRatio(Math.max(0.05, Math.min(0.5, parseFloat(e.target.value) || 0.2)))
                    }
                    min={0.05}
                    max={0.5}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">RNG Seed</label>
                  <Input
                    type="number"
                    value={seed}
                    disabled={status === 'running'}
                    onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
