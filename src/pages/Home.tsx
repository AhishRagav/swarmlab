import { Link } from 'react-router-dom'
import { problemRegistry, algorithmRegistry, visualizationRegistry } from '@/registries'

const problemIcons: Record<string, string> = {
  'function-optimizer': 'ƒ',
  'warehouse-optimizer': '📦',
}

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

      {/* Problem Applications Grid from Problem Registry */}
      <section className="grid gap-6 md:grid-cols-2">
        {registeredProblems.map((prob) => {
          const visList = visualizationRegistry.getForProblem(prob.id)
          const icon = problemIcons[prob.id] ?? '⚙️'

          return (
            <Link
              key={prob.id}
              to={prob.route}
              className="group block rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg space-y-4"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl" role="presentation">
                  {icon}
                </span>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-card-foreground group-hover:text-primary transition-colors">
                      {prob.name}
                    </h2>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {prob.category}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {prob.description}
                  </p>
                </div>
              </div>

              {/* Supported Visualizations list */}
              <div className="pt-3 border-t border-border/60 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-muted-foreground mr-1">Visualizations:</span>
                {visList.map((vis) => (
                  <span
                    key={vis.id}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/80 text-foreground border border-border/40"
                  >
                    {vis.name}
                  </span>
                ))}
              </div>
            </Link>
          )
        })}
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
