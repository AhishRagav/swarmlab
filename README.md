# SwarmLab — Interactive Optimization Platform

SwarmLab is an interactive web application that demonstrates how **Particle Swarm Optimization (PSO)** can solve different mathematical and real-world optimization problems through dynamic visualizations.

Explore optimization, experiment with PSO parameters, and observe how a swarm of particles searches for optimal solutions.

## Features

### 1. Mathematical Function Optimizer

Optimize mathematical functions across multiple dimensions using Particle Swarm Optimization.

- Supports 1 to 20 dimensions.
- Includes benchmark functions:
  - Sphere
  - Rastrigin
  - Ackley
  - Rosenbrock
  - Beale
  - Himmelblau
  - Three-Hump Camel
- Supports custom mathematical expressions.
- Configure individual variable bounds.
- Interactive 1D, 2D and 3D visualizations.
- Multi-dimensional slice projections.
- Visualize particle movement and optimization convergence.

### 2. Warehouse Placement Optimizer

Find optimal warehouse locations to serve customers efficiently while minimizing total transportation distance.

- Configure the number of warehouses and customers.
- Support random and manual customer placement.
- Configure coordinate search boundaries.
- Assign customers to their nearest warehouse.
- Minimize total customer-to-warehouse distance.
- Interactive 2D spatial visualization.
- View warehouse assignments and transportation distances.
- Inspect Current Position, Personal Best (Pbest) and Global Best (Gbest).

### 3. Robot Path Planning Optimizer

Find a short, smooth and collision-free path for a robot to reach its destination while avoiding obstacles.

- Configure the environment, starting point and destination.
- Create, move and remove rectangular obstacles.
- Generate candidate paths using intermediate waypoints.
- Strict collision detection to reject invalid paths.
- Optimize path length and turning smoothness.
- Visualize Current Position, Personal Best (Pbest) and Global Best (Gbest).
- Animate the robot along the optimized path.
- Track fitness and optimization convergence.

## Particle Swarm Optimization

All three optimizers use Particle Swarm Optimization.

The velocity update equation is:

$$

v_i(t+1)=wv_i(t)+c_1r_1(pbest_i-x_i(t))+c_2r_2(gbest-x_i(t))

$$

The position update equation is:

$$

x_i(t+1)=x_i(t)+v_i(t+1)

$$

The application allows users to experiment with:

- Swarm size
- Maximum iterations
- Inertia weight (\(w\))
- Cognitive coefficient (\(c_1\))
- Social coefficient (\(c_2\))
- Initial velocity
- Velocity clamping
- Inertia weight schedules
- Random seed for reproducible optimization

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| Mathematical Expressions | Math.js |
| Visualizations | Plotly.js, Recharts, HTML5 Canvas |
| Optimization Algorithm | Particle Swarm Optimization |

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

Clone the repository:

```bash
git clone https://github.com/AhishRagav/swarmlab.git
```

Navigate to the project directory:

```bash
cd swarmlab
```

Install dependencies:

```bash
npm install
```

### Run Locally

Start the development server:

```bash
npm run dev
```

Open the application in your browser:

http://localhost:5173

### Build for Production

```bash
npm run build
```

## Project Structure

```text
swarmlab/
├── src/
│   ├── algorithms/
│   │   └── pso/                  # PSO implementation
│   │
│   ├── problems/
│   │   ├── function-optimizer/   # Mathematical function optimization
│   │   ├── warehouse/            # Warehouse placement optimization
│   │   └── robot-path/           # Robot path planning
│   │
│   ├── simulation/               # Simulation controller and state
│   │
│   ├── visualization/
│   │   ├── function-optimizer/   # Function visualizations
│   │   ├── warehouse/            # Warehouse visualization
│   │   ├── robot-path/           # Robot path visualization
│   │   └── shared/               # Shared visualizations
│   │
│   ├── registries/                # Algorithm, problem and visualization registries
│   ├── components/                # Reusable UI components
│   └── pages/                     # Application pages
│
├── public/
├── package.json
└── README.md
```

## License

This project is licensed under the MIT License.