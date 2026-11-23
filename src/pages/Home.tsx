import { Link } from 'react-router-dom'

const applications = [
  {
    title: 'Mathematical Function Optimizer',
    description:
      'Optimize mathematical functions using swarm intelligence. Visualize particles exploring N-dimensional search spaces with contour plots, 3D surfaces, and convergence charts.',
    to: '/function-optimizer',
    icon: 'ƒ',
  },
  {
    title: 'Warehouse Placement Optimizer',
    description:
      'Find optimal warehouse locations to minimize demand-weighted customer distances. Watch the swarm converge on the best placement strategy.',
    to: '/warehouse',
    icon: '📦',
  },
]

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center space-y-4 py-12">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Welcome to <span className="text-primary">SwarmLab</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          An interactive educational platform for understanding and
          experimenting with optimization algorithms, starting with Particle
          Swarm Optimization.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {applications.map((app) => (
          <Link
            key={app.to}
            to={app.to}
            className="group block rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl" role="presentation">
                {app.icon}
              </span>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-card-foreground group-hover:text-primary transition-colors">
                  {app.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {app.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="text-center space-y-3 py-8">
        <h2 className="text-2xl font-semibold">What is PSO?</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Particle Swarm Optimization is a computational method that optimizes a
          problem by iteratively improving candidate solutions. Inspired by the
          social behavior of bird flocking, particles move through the search
          space, guided by their own best-known position and the swarm's
          best-known position.
        </p>
      </section>
    </div>
  )
}
