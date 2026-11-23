# SwarmLab — Interactive Optimization Algorithm Platform

SwarmLab is an interactive, educational web application for exploring and experimenting with optimization algorithms, featuring mathematically authentic **Particle Swarm Optimization (PSO)** applied to **Mathematical Function Optimization** and **Warehouse Placement Optimization**.

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [User Guide](#user-guide)
  - [Mathematical Function Optimizer](#1-mathematical-function-optimizer)
  - [Warehouse Placement Optimizer](#2-warehouse-placement-optimizer)
- [Extending SwarmLab](#extending-swarmlab)
  - [Adding a New Optimization Algorithm](#adding-a-new-algorithm)
  - [Adding a New Optimization Problem](#adding-a-new-problem)
  - [Registering a New Visualization](#registering-a-new-visualization)
- [Testing & Quality Assurance](#testing--quality-assurance)

---

## Overview

SwarmLab decouples mathematical simulation logic from UI rendering to provide clean, educational visualizations of swarm intelligence. The platform executes standard velocity and position update equations, tracks true candidate coordinates and fitness values without hardcoded or fabricated simulation states, and supports dynamic, user-driven parameter experimentation.

---

## Key Features

1. **Syllabus-Aligned Particle Swarm Optimization**:
   - Standard velocity equation: $v_d(t+1) = w(t) v_d(t) + c_1 r_1 (pbest_d - x_d) + c_2 r_2 (gbest_d - x_d)$
   - Standard position equation: $x_d(t+1) = x_d(t) + v_d(t+1)$
   - Configurable swarm size, inertia weight ($w$), cognitive acceleration ($c_1$), and social acceleration ($c_2$).
   - Initial velocity configuration: **Zero initialization** (syllabus default) or **Random initialization** ($\pm 10\%$ of search span).
   - Velocity clamping ($V_{\max}$): Clamped to a configurable ratio (default 20% of variable range) per dimension.
   - Boundary handling: **Position clipping** (clamps coordinate, preserves velocity) or **Absorb** (clamps coordinate and zeroes out velocity).
   - Inertia weight schedules: Constant fixed $w$ or linear decrease from $0.9 \to 0.4$ over scheduled iterations.
   - Seedable PRNG (Mulberry32) for reproducible, deterministic optimization replays.

2. **Mathematical Function Optimizer**:
   - Continuous optimization from $N = 1$ to $N = 20$ dimensions.
   - Seven standard benchmark functions: Sphere, Rastrigin, Ackley, Rosenbrock, Beale, Himmelblau, and Three-Hump Camel.
   - Safe custom mathematical expression parsing using `mathjs` (never executes `eval()`).
   - Dimension-adaptive visualizations:
     - **$N = 1$**: 1D continuous curve plot of $f(x)$ with live swarm markers.
     - **$N = 2$**: 2D contour and heatmap landscape with Viridis scale and particle coordinates.
     - **$N = 3$**: Interactive 3D scatter distribution in $(x_1, x_2, x_3)$ space.
     - **$N \ge 4$**: Interactive 2D slice projection on any two user-selected axes $(x_i, x_j)$ with remaining variables fixed at current $gbest$, plus a complete variable coordinate breakdown table.
   - Recharts convergence line chart tracking best objective value across iterations.

3. **Warehouse Placement Optimizer**:
   - Solves multi-facility Weber / warehouse placement in 2D space.
   - Dimensionality: $2K$, where each candidate particle represents the $(x, y)$ coordinates of all $K$ warehouses.
   - Objective: Minimizes customer demand-weighted transportation distance:
     $$F = \sum_{i=1}^M \left[ d_i \times \min_{k=1 \dots K} \sqrt{(c_{i,x} - w_{k,x})^2 + (c_{i,y} - w_{k,y})^2} \right]$$
   - Nearest-warehouse customer assignments computed dynamically on every iteration.
   - Interactive HTML Canvas 2D spatial map:
     - Real-time customer nodes (radius scaled to demand $d_i$).
     - Warehouse facilities ($W_1, W_2, \dots$) color-coded by cluster.
     - Dotted assignment lines linking customers to their nearest warehouse.
     - Hover tooltips displaying exact coordinates, demands, and transportation costs.
     - Click-to-add customer support in manual placement mode.

4. **Extensible Registry System**:
   - Modular registries for Algorithms (`AlgorithmRegistry`), Problems (`ProblemRegistry`), and Visualizations (`VisualizationRegistry`).
   - Clean abstractions allow adding Genetic Algorithms (GA), Artificial Bee Colony (ABC), or Traveling Salesperson Problems (TSP) without rewriting existing components.

---

## Technology Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 with dark/light mode CSS design tokens
- **State Management**: Zustand store factories decoupled from React render loops
- **Math Parsing**: Math.js
- **Visualizations**: Plotly.js (`plotly.js-dist-min`), Recharts, HTML5 Canvas
- **Testing**: Vitest
- **Linting**: ESLint with typescript-eslint

---

## Architecture Overview

```
src/
├── algorithms/                 # Optimization algorithm abstractions & engines
│   ├── types.ts                # AlgorithmState, AlgorithmConfig, AlgorithmFactory
│   └── pso/                    # Mathematically correct PSO engine (syllabus-aligned)
├── problems/                   # Problem definitions & mathematical objectives
│   ├── types.ts                # ProblemDefinition contract
│   ├── function-optimizer/     # Benchmarks & safe mathjs expression evaluator
│   └── warehouse/              # Warehouse placement problem, 2K coordinates & distances
├── simulation/                 # Simulation state machine & execution controller
│   ├── controller.ts           # SimulationController (Play/Pause/Step/Reset/Timers)
│   ├── store.ts                # Generic Zustand store factory
│   └── types.ts                # SimulationStatus, SimulationSnapshot, ConvergencePoint
├── visualization/              # Modular visualization components
│   ├── shared/                 # ConvergenceChart (Recharts)
│   ├── function-optimizer/     # CurvePlot, ContourPlot, SurfacePlot, ProjectionPlot
│   └── warehouse/              # WarehouseCanvas, Canvas coordinate transforms & rendering
├── registries/                 # Central extensible registry hubs
│   ├── algorithmRegistry.ts    # Algorithm registration & lookup
│   ├── problemRegistry.ts      # Problem registration & routes
│   └── visualizationRegistry.ts# Visualizations mapped to problems
├── components/                 # Reusable UI & control components
│   ├── SimulationControls.tsx  # Shared control bar (Play, Pause, Step, Reset, Speed)
│   └── ui/                     # Button, Input, Select, Card, PlotlyChart
└── pages/                      # Application route views
    ├── Home.tsx                # Landing hub showing registered algorithms and problems
    ├── FunctionOptimizerPage.tsx# Interactive mathematical function optimizer view
    └── WarehousePage.tsx       # Interactive warehouse placement optimizer view
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended; developed and tested on Node.js v22)
- npm (v9 or higher)

### Installation
```bash
git clone https://github.com/your-username/swarmlab.git
cd swarmlab
npm install
```

### Running Locally
To launch the Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

- `npm run dev`: Starts the local development server with Hot Module Replacement.
- `npm test`: Runs the Vitest test suite once.
- `npm run test:watch`: Runs Vitest in interactive watch mode.
- `npm run lint`: Checks TypeScript and React code using ESLint.
- `npm run build`: Type-checks (`tsc -b`) and bundles production assets with Vite.
- `npm run preview`: Previews the production build locally.

---

## User Guide

### 1. Mathematical Function Optimizer
1. Navigate to **Function Optimizer** from the header navigation.
2. Select an optimization mode:
   - **Predefined Benchmark**: Choose Sphere, Rastrigin, Ackley, Rosenbrock, Beale, Himmelblau, or Three-Hump Camel.
   - **Custom Expression**: Type any continuous math expression (e.g. `x^2 + y^2 - 10*cos(2*pi*x)`). Variable names: `x, y, z` or `x1, x2, ..., xN`.
3. Choose the number of dimensions ($1 \le N \le 20$) and configure per-variable search bounds.
4. Tune PSO hyperparameters: Swarm Size, Max Iterations, Inertia ($w$), Cognitive ($c_1$), Social ($c_2$), Initial Velocity mode, Velocity Clamp ($V_{\max}$), and Inertia schedule.
5. Click **Apply & Reset Swarm**.
6. Use the simulation control bar:
   - **Play**: Runs the optimization at configurable speeds (1× to 20×).
   - **Pause**: Halts execution at the current iteration.
   - **Step**: Executes exactly one iteration.
   - **Reset**: Re-initializes the swarm to iteration 0 with the same random seed.

### 2. Warehouse Placement Optimizer
1. Navigate to **Warehouse Optimizer** from the header navigation.
2. Configure problem dimensions:
   - Set the number of warehouses $K$ ($1 \le K \le 10$, dimensionality $= 2K$).
   - Set the customer count $M$ ($2 \le M \le 100$).
   - Select customer placement: **Random Placement** or **Manual Coordinates**. In manual mode, you can type coordinates or click directly on the canvas map.
   - Select customer demands: **Equal Demand** ($1.0$), **Random Demand** ($1 \dots 10$), or **Custom Demand**.
   - Configure 2D coordinate search bounds $[X_{\min}, X_{\max}] \times [Y_{\min}, Y_{\max}]$.
3. Click **Apply & Reset Swarm**.
4. Observe the interactive canvas:
   - Hover over customer and warehouse nodes for detailed coordinate and cost breakdowns.
   - Watch warehouses dynamically navigate toward customer clusters to minimize transportation costs.
   - Inspect the assignment breakdown table and convergence line chart.

---

## Extending SwarmLab

### Adding a New Algorithm
To add a new optimization algorithm (e.g., Genetic Algorithm or Artificial Bee Colony):

1. Define an algorithm factory implementing `AlgorithmFactory<TState, TConfig>` in `src/algorithms/`:
   ```ts
   import type { AlgorithmFactory } from '@/algorithms/types'

   export const gaFactory: AlgorithmFactory<GAState, GAConfig> = {
     id: 'genetic-algorithm',
     name: 'Genetic Algorithm',
     description: 'Standard Genetic Algorithm with crossover and mutation.',
     createInitialState(config, bounds, evaluateFn, rng) { /* ... */ },
     step(state, config, bounds, evaluateFn, rng, iter, maxIter) { /* ... */ }
   }
   ```
2. Register it in `src/registries/algorithmRegistry.ts`:
   ```ts
   import { algorithmRegistry } from '@/registries'
   import { gaFactory, defaultGAConfig } from '@/algorithms/ga'

   algorithmRegistry.register({
     id: 'ga',
     name: 'Genetic Algorithm',
     description: 'Crossover and mutation-based evolutionary algorithm.',
     category: 'evolutionary',
     factory: gaFactory,
     defaultConfig: defaultGAConfig,
   })
   ```

### Adding a New Problem
To register a new optimization problem:

1. Create your problem definition generator implementing `ProblemDefinition` in `src/problems/`:
   ```ts
   export function createMyProblem(config: MyConfig): ProblemDefinition {
     return {
       id: 'my-problem',
       name: 'My Problem',
       description: 'Problem description',
       dimensions: config.dimensions,
       bounds: config.bounds,
       objective: 'minimize',
       evaluate: (pos) => calculateCost(pos),
     }
   }
   ```
2. Register it in `src/registries/problemRegistry.ts`:
   ```ts
   problemRegistry.register({
     id: 'my-problem',
     name: 'My Problem Name',
     description: 'Educational description',
     category: 'combinatorial',
     route: '/my-problem',
     createProblem: createMyProblem,
   })
   ```

### Registering a New Visualization
Link a visualization component to a registered problem in `src/registries/visualizationRegistry.ts`:
```ts
visualizationRegistry.register({
  id: 'my-custom-canvas',
  name: 'Custom 2D Map',
  description: 'Canvas rendering of problem nodes',
  problemId: 'my-problem',
  type: 'canvas-2d',
})
```

---

## Testing & Quality Assurance

SwarmLab is thoroughly verified with an automated Vitest test suite and strict linting rules:

```bash
npm test -- --run
npm run lint
npm run build
```

The test suite covers:
- **Smoke Tests**: Application bootstrap and routing integrity.
- **PSO Engine Tests**: Velocity and position updates, zero and random velocity initialization, velocity clamping, clipping and absorb boundary handling, fixed and linearly decreasing inertia, deterministic reproducibility, and $N=20$ multi-dimensional scaling.
- **Simulation Controller Tests**: State machine, timer guards against duplication, step-by-step advances, auto-pause on max iterations, and objective value preservation.
- **Mathematical Function Tests**: Scope mapping, safe expression compilation without `eval()`, benchmark functions, dimension constraints, and per-variable bounds.
- **Warehouse Problem Tests**: Euclidean distance, $2K$ coordinate extraction, exact demand-weighted arithmetic $F$, problem definition bounds, input validation, and multi-iteration PSO convergence.
- **Canvas Rendering Tests**: World-to-canvas coordinate transformations, canvas-to-world inversion, customer demand radius scaling, and warehouse color palette generation.
- **Registry Tests**: Algorithm, problem, and visualization registration, lookup, duplicate rejection, and dimension constraint evaluation.
- **End-to-End Manual Verification Tests**: Verification of all user requirements across both optimizers.

---

## License
MIT License. Created for interactive optimization algorithm education and research.
