import { Link } from 'react-router-dom'
import { problemRegistry, algorithmRegistry } from '@/registries'

export default function Home() {
  const registeredProblems = problemRegistry.getAll()
  const registeredAlgorithms = algorithmRegistry.getAll()

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

        {/* Algorithm Registry Highlights */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
            Active Engine:
          </span>
          {registeredAlgorithms.map((algo) => (
            <span
              key={algo.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {algo.name} ({algo.category})
            </span>
          ))}
        </div>
      </section>

      {/* Problem Applications Grid: 3 columns desktop, 2 tablet, 1 mobile */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {registeredProblems.map((prob) => (
          <Link
            key={prob.id}
            to={prob.route}
            className="group flex flex-col justify-start h-full rounded-lg border border-border bg-card p-5 transition-all duration-200 hover:border-primary hover:bg-card/90 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors mb-2">
              {prob.name}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {prob.description}
            </p>
          </Link>
        ))}
      </section>

      <section className="text-center space-y-3 py-8 max-w-3xl mx-auto bg-secondary/20 p-8 rounded-xl border border-border">
        <h2 className="text-2xl font-semibold">What is Particle Swarm Optimization?</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Particle Swarm Optimization (PSO) is a population-based stochastic optimization technique developed by Kennedy and Eberhart.
          Candidate solutions, called <strong>particles</strong>, navigate an N-dimensional search space guided by their personal best experience (cognitive component)
          and the collective swarm best (social component) using standard velocity and position update equations.
        </p>
      </section>
    </div>
  )
}
