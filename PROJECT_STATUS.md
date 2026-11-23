# SwarmLab — Project Status

## Overview
SwarmLab is an interactive educational platform for optimization algorithms, built with React, TypeScript, Vite, Tailwind CSS, Zustand, Math.js, Plotly, Recharts, and Vitest.

---

## Current Status: Batch 2 (Phase 4 & Phase 5) (Completed)

### Phase 1: Foundation (Completed)
- **Styling**: Tailwind CSS with custom CSS variables (light and dark mode theme tokens) in `src/index.css`.
- **Reusable UI Components**: `Button`, `Input`, `Slider`, `Select`, `Card` (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) with `cn()` utility in `src/lib/utils.ts`.
- **Routing & Navigation**: React Router setup in `src/App.tsx` and layout shell in `src/components/Layout.tsx`.
- **Pages**: Landing page (`src/pages/Home.tsx`), Function Optimizer page, Warehouse Optimizer page.
- **Tooling & Test Harness**: Vitest setup with `@/*` path alias.

### Phase 2: PSO Engine & Generic Simulation Controller (Syllabus-Aligned, Completed)
- **Deterministic RNG (`src/lib/rng.ts`)**:
  - `createRNG(seed?: number)` with Mulberry32 32-bit deterministic PRNG for reproducible simulations.
- **Algorithm Abstractions (`src/algorithms/types.ts`)**:
  - Minimal `AlgorithmState` contract (`bestPosition`, `bestFitness`, `bestObjective`).
  - Algorithm-agnostic evaluation contract: `EvaluateFn = (position: number[]) => { fitness, objective }`.
  - Generic `AlgorithmFactory<TState, TConfig>`.
- **Syllabus-Aligned PSO Engine (`src/algorithms/pso/`)**:
  - Standard PSO velocity & position update equations:
    $$v_d(t+1) = w(t) v_d(t) + c_1 r_1 (pbest_d - x_d) + c_2 r_2 (gbest_d - x_d)$$
    $$x_d(t+1) = x_d(t) + v_d(t+1)$$
  - **Initial Velocity**:
    - `zero` (**syllabus default**): initial velocities set to 0.
    - `random`: initial velocities sampled uniformly within $\pm 10\%$ of search range ($[-0.1 \times \text{span}, +0.1 \times \text{span}]$).
  - **Velocity Clamping ($V_{\max}$)**:
    - Maximum velocity clamped to $v_{\max, d} = \text{clampRatio} \times \text{span}$ (default 20% of range).
    - Applied immediately after calculating new velocity and before position update.
  - **Boundary Handling**:
    - `clipping` (**syllabus default**): clamps position without altering velocity.
    - `absorb`: clamps position and zeroes out velocity in the affected dimension.
  - **Inertia Weight Strategy**:
    - `fixed` (**default**): constant inertia $w$.
    - `linear-decrease`: dynamically decreases from 0.9 to 0.4 over `maxIterations`:
      $$w(t) = 0.9 - 0.5 \times \min\left(1, \frac{t}{\max(1, \text{maxIterations} - 1)}\right)$$
  - Multi-dimensional support from $N=1$ to $N=20$.
  - Immutability: Pure functional transitions with no state mutations.
- **Generic Simulation Controller (`src/simulation/controller.ts`)**:
  - Decoupled from React render cycles; uses configurable `setInterval`.
  - State machine: `idle`, `running`, `paused`.
  - `play()` with strict guard against duplicate timers.
  - `step()` executes exactly one iteration without changing status.
  - `reset()` restores initial swarm state and recreates RNG with identical seed for deterministic replays.
  - `createEvaluateFn()` transparently negates fitness for maximization problems while preserving un-negated objective values for display.
- **Zustand Store Factory (`src/simulation/store.ts`)**:
  - `createSimulationStore<TState, TConfig>()` creates fully typed Zustand stores preserving concrete algorithm states without type assertions or `any`.

### Phase 3: Mathematical Function Optimizer (Completed)
- **Safe Math Expression Evaluator (`src/lib/math.ts`, `src/problems/function-optimizer/expression.ts`)**:
  - Uses `mathjs` compilation without `eval()`.
  - Variable mapping: `x, y, z` for 1D-3D, and `x1, x2, ..., xN` for $1 \le N \le 20$.
  - Safe error recovery and validation trapping division by zero and invalid syntax.
- **Benchmark Functions (`src/problems/function-optimizer/functions.ts`)**:
  - **Sphere**: Continuous, convex, $N$-dimensional benchmark ($f(0) = 0$).
  - **Rastrigin**: Highly multimodal benchmark with regular local minima ($f(0) = 0$).
  - **Ackley**: Multimodal with steep central funnel ($f(0) = 0$).
  - **Rosenbrock**: Curved valley / banana benchmark ($f(1) = 0$).
  - **Beale**: 2D benchmark with sharp peaks ($f(3, 0.5) = 0$).
  - **Himmelblau**: 2D benchmark with 4 identical local/global minima ($f = 0$).
  - **Three-Hump Camel**: 2D benchmark with multiple local minima ($f(0, 0) = 0$).
  - Dimension constraints enforced per function (`validDimensions: 'any' | number[]`).
- **Function Problem Definition (`src/problems/function-optimizer/problem.ts`)**:
  - Implements `ProblemDefinition` with per-variable bounds (`bounds[i] = [min_i, max_i]`) and minimize/maximize modes.
- **UI Integration (`src/pages/FunctionOptimizerPage.tsx`, `src/components/SimulationControls.tsx`)**:
  - Mode switcher: Benchmark function vs. Custom expression.
  - Dimension selector ($N=1$ to $N=20$) with automated constraints.
  - Per-variable bounds editor with uniform batch-setting tool.
  - Live mathematical expression validation with error hints and variable guide.
  - Full PSO hyperparameter controls ($w, c_1, c_2, \text{swarmSize}, \text{maxIterations}, \text{seed}$).
  - Syllabus option controls: Initial Velocity (zero vs. random), Boundary Handling (clipping vs. absorb), Inertia Schedule (fixed vs. linear decrease), Velocity Clamping ($V_{\max}$ ratio).
  - Simulation control bar (Play, Pause, Step, Reset, Speed slider, Iteration counter).
  - Real-time Best Objective Value card, Convergence Gain percentage, and Swarm Activity.
  - Best solution vector display ($x_1^*, \dots, x_N^*$).
  - Live particle population table with positions, velocities, and personal best values.

### Phase 4: Function Optimizer Visualizations (Completed)
- **Plotly Integration Wrapper (`src/components/ui/PlotlyChart.tsx`)**:
  - Responsive, theme-aware Plotly wrapper built directly on `plotly.js-dist-min` for React 19 compatibility.
  - Automatic container resize observer and unmount memory purge.
- **Shared Convergence Chart (`src/visualization/shared/ConvergenceChart.tsx`)**:
  - Recharts line chart tracking global best objective value across simulation iterations.
  - Supports adaptive scientific notation, dark-mode tooltips, and iteration markers.
- **1D Curve Plot (`src/visualization/function-optimizer/CurvePlot.tsx`)**:
  - Renders true mathematical function curve $f(x)$ sampled over search bounds.
  - Overlays actual particle positions and objective values $(x_i, f(x_i))$.
  - Highlights global best position $gbest$ with a gold star marker.
- **2D Contour Plot (`src/visualization/function-optimizer/ContourPlot.tsx`)**:
  - Computes 2D objective contour/heatmap landscape with Viridis color scale.
  - Overlays live swarm positions $(x_{i,1}, x_{i,2})$ and global best marker.
- **3D Surface & Scatter Plot (`src/visualization/function-optimizer/SurfacePlot.tsx`)**:
  - Renders 3D scatter distribution of particles in $(x_1, x_2, x_3)$ space.
  - Color-codes particles by evaluated objective value with Plasma color scale and highlights $gbest$.
- **N ≥ 4 Projection Plot (`src/visualization/function-optimizer/ProjectionPlot.tsx`)**:
  - Dynamic 2D projection slice on any two user-selected dimensions $(x_i, x_j)$.
  - Evaluates slice landscape with all remaining $N-2$ dimensions fixed at current $gbest$.
  - Projects live particle swarm and $gbest$ onto the selected 2D plane.
- **N ≥ 4 Variable Coordinate Table (`src/visualization/function-optimizer/VariableTable.tsx`)**:
  - Displays all $N$ variable names, bounds, current optimal coordinates, and normalized relative position bars.

### Phase 5: Warehouse Placement Optimizer (Completed)
- **Problem Formulation & Types (`src/problems/warehouse/types.ts`)**:
  - Supports $M$ customer nodes with 2D coordinates $(x_i, y_i)$ and demands $d_i > 0$.
  - Supports $K$ warehouse locations with 2D coordinates $(w_{k,x}, w_{k,y})$.
  - Dimensionality: each particle vector represents all warehouse coordinates, dimension $= 2K$.
  - Alternating search bounds: $[minX, maxX]$ and $[minY, maxY]$ repeated $K$ times.
  - Objective: Minimize total demand-weighted distance:
    $$F = \sum_{i=1}^M \left[ d_i \times \min_{k=1 \dots K} \sqrt{(c_{i,x} - w_{k,x})^2 + (c_{i,y} - w_{k,y})^2} \right]$$
- **Warehouse Optimization Logic (`src/problems/warehouse/problem.ts`)**:
  - `euclideanDistance`: precise 2D Euclidean distance calculation.
  - `extractWarehouseCoordinates`: maps flat $2K$ position vectors to coordinate pairs.
  - `calculateWarehouseObjective`: exact demand-weighted evaluation.
  - `analyzeWarehouseSolution`: computes customer-to-warehouse assignments, nearest warehouse index, distance, weighted cost, and per-warehouse aggregated metrics (assigned customers and total demand served).
  - `createWarehouseProblem`: builds standard `ProblemDefinition` compatible with the PSO engine and SimulationController.
  - `generateRandomCustomers`: deterministic, seeded customer generation supporting equal ($1.0$) and random integer demands ($[1, 10]$).
- **Interactive Warehouse Optimizer Page (`src/pages/WarehousePage.tsx`)**:
  - User controls for warehouse count ($K \in [1, 10]$) and customer count ($M \in [2, 100]$).
  - Customer placement modes: Random placement with regeneration vs. Manual coordinate/demand entry and deletion.
  - Customer demand modes: Equal demand, Random demand, and Custom per-customer demands.
  - Configurable 2D spatial coordinate bounds $[minX, maxX] \times [minY, maxY]$.
  - Full PSO hyperparameter controls with syllabus-aligned options (initial velocity mode, boundary handling, velocity clamping, and linear inertia reduction).
  - Reusable `SimulationControls` bar for Play, Pause, Step, Reset, and Speed adjustments.
  - Metric summary cards: Total Cost ($F$), Cost Reduction %, and Swarm Scale.
  - Optimized warehouse coordinates card with per-warehouse customer count and total demand served.
  - Detailed customer assignment breakdown table with coordinates, demands, assigned warehouses, and weighted transportation costs.
  - Real-time `ConvergenceChart` tracking warehouse placement optimization across iterations.

---

## Test Results
- **Vitest Suite**: 6 test files, 36 unit tests passing (`100% pass`).
  - `src/__tests__/smoke.test.ts` (1 test)
  - `src/__tests__/pso.test.ts` (11 tests: zero velocity init, random velocity init within $\pm 10\%$, velocity clamping at $V_{\max}$, position clipping boundary handling, absorb boundary handling, fixed vs. linearly decreasing inertia $0.9 \to 0.4$, deterministic seeding, immutability, Sphere optimization convergence, $N=20$ scaling)
  - `src/__tests__/simulation.test.ts` (6 tests: state machine, single step, duplicate timer guard, auto-pause on max iterations, reset reproducibility, maximization negation)
  - `src/__tests__/functionProblem.test.ts` (6 tests: scope mapping, expression validation, eval-free custom execution, benchmark evaluation, dimension constraints, per-variable bounds)
  - `src/__tests__/visualizations.test.ts` (4 tests: 1D curve sampling, 2D contour grid generation, slice projection holding other dimensions fixed at $gbest$, safe variable percentage normalization)
  - `src/__tests__/warehouseProblem.test.ts` (8 tests: Euclidean distance accuracy, $2K$ coordinate extraction, exact demand-weighted arithmetic $F$, problem definition $2K$ dimensions and alternating bounds, invalid inputs rejection, reproducible seeded customer generation, random demand range $[1, 10]$, multi-iteration PSO convergence minimizing total warehouse transport distance)
- **ESLint**: Passed with 0 errors, 0 warnings (`eslint .`).
- **Production Build**: Successfully compiled with `tsc -b && vite build`.

---

## Remaining Phases
- **Phase 6**: Warehouse Optimizer Visualizations (Interactive HTML Canvas 2D spatial map rendering customer pins, warehouse icons, nearest-neighbor connection lines, and particle trajectory overlays).
- **Phase 7**: Registries & Final Polish (dynamic registration, educational explanations, responsive polish, end-to-end tests).
