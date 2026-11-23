# SwarmLab — Project Status

## Overview
SwarmLab is an interactive educational platform for optimization algorithms, built with React, TypeScript, Vite, Tailwind CSS, Zustand, Math.js, and Vitest.

---

## Current Status: Batch 1 (Phase 2 & Phase 3) + Syllabus Alignment (Completed)

### Phase 1: Foundation (Completed)
- **Styling**: Tailwind CSS with custom CSS variables (light and dark mode theme tokens) in `src/index.css`.
- **Reusable UI Components**: `Button`, `Input`, `Slider`, `Select`, `Card` (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) with `cn()` utility in `src/lib/utils.ts`.
- **Routing & Navigation**: React Router setup in `src/App.tsx` and layout shell in `src/components/Layout.tsx`.
- **Pages**: Landing page (`src/pages/Home.tsx`), Function Optimizer page, Warehouse Optimizer placeholder.
- **Tooling & Test Harness**: Vitest setup with `@/*` path alias.

### Phase 2: PSO Engine & Generic Simulation Controller (Syllabus-Aligned)
- **Deterministic RNG (`src/lib/rng.ts`)**:
  - `createRNG(seed?: number)` with Mulberry32 32-bit deterministic PRNG for reproducible simulations.
- **Algorithm Abstractions (`src/algorithms/types.ts`)**:
  - Minimal `AlgorithmState` contract (`bestPosition`, `bestFitness`, `bestObjective`).
  - Algorithm-agnostic evaluation contract: `EvaluateFn = (position: number[]) => { fitness, objective }`.
  - Generic `AlgorithmFactory<TState, TConfig>`.
- **Syllabus-Aligned PSO Engine (`src/algorithms/pso/`)**:
  - Standard PSO velocity & position update equations:
    $v_d(t+1) = w(t) v_d(t) + c_1 r_1 (pbest_d - x_d) + c_2 r_2 (gbest_d - x_d)$
    $x_d(t+1) = x_d(t) + v_d(t+1)$
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
      $w(t) = 0.9 - 0.5 \times \frac{t}{\text{maxIterations}}$.
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

---

## Test Results
- **Vitest Suite**: 4 test files, 24 unit tests passing (`100% pass`).
  - `src/__tests__/smoke.test.ts` (1 test)
  - `src/__tests__/pso.test.ts` (11 tests: zero velocity init, random velocity init within $\pm 10\%$, velocity clamping at $V_{\max}$, position clipping boundary handling, absorb boundary handling, fixed vs. linearly decreasing inertia $0.9 \to 0.4$, deterministic seeding, immutability, Sphere optimization convergence, $N=20$ scaling)
  - `src/__tests__/simulation.test.ts` (6 tests: state machine, single step, duplicate timer guard, auto-pause on max iterations, reset reproducibility, maximization negation)
  - `src/__tests__/functionProblem.test.ts` (6 tests: scope mapping, expression validation, eval-free custom execution, benchmark evaluation, dimension constraints, per-variable bounds)
- **ESLint**: Passed with 0 errors, 0 warnings (`eslint .`).
- **Production Build**: Successfully compiled with `tsc -b && vite build`.

---

## Remaining Phases
- **Phase 4**: Function Optimizer Visualizations (Plotly 1D curve, 2D contour, 3D surface, $N \ge 4$ 2D projection, and Recharts convergence line chart).
- **Phase 5**: Warehouse Optimizer Problem & Page (Customer/warehouse configuration, demand weighting, manual & random placement).
- **Phase 6**: Warehouse Optimizer Visualizations (HTML Canvas rendering of customers, warehouses, and demand-weighted nearest assignments).
- **Phase 7**: Registries & Final Polish (dynamic registration, educational explanations, responsive polish, end-to-end tests).
