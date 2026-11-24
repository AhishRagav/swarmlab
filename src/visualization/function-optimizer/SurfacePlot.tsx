import { useMemo } from 'react'
import type { Particle } from '@/algorithms/pso/types'
import { PlotlyChart } from '@/components/ui/PlotlyChart'

export interface SurfacePlotProps {
  bounds: [number, number][]
  evaluate: (pos: number[]) => number
  particles: Particle[]
  gbest: number[] | null
  className?: string
}

export function SurfacePlot({ bounds, evaluate, particles, gbest, className }: SurfacePlotProps) {
  const b0 = bounds[0] ?? [-5, 5]
  const b1 = bounds[1] ?? [-5, 5]
  const b2 = bounds[2] ?? [-5, 5]

  // Extract 3D particle positions and evaluated objectives for coloring
  const particlePoints = useMemo(() => {
    const px: number[] = []
    const py: number[] = []
    const pz: number[] = []
    const colors: number[] = []
    const text: string[] = []

    particles.forEach((p, idx) => {
      const x = p.position[0]
      const y = p.position[1]
      const z = p.position[2]
      if (
        typeof x === 'number' &&
        typeof y === 'number' &&
        typeof z === 'number' &&
        !isNaN(x) &&
        !isNaN(y) &&
        !isNaN(z)
      ) {
        px.push(x)
        py.push(y)
        pz.push(z)
        try {
          const val = evaluate(p.position)
          colors.push(val)
        } catch {
          colors.push(p.pbestObjective)
        }
        text.push(`Particle ${idx + 1}: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`)
      }
    })

    return { px, py, pz, colors, text }
  }, [particles, evaluate])

  const plotData: Plotly.Data[] = [
    {
      x: particlePoints.px,
      y: particlePoints.py,
      z: particlePoints.pz,
      type: 'scatter3d',
      mode: 'markers',
      name: 'Particles',
      marker: {
        size: 5,
        color: particlePoints.colors,
        colorscale: 'Plasma',
        colorbar: {
          title: { text: 'Objective', font: { size: 10, color: '#94a3b8' } },
          thickness: 12,
          len: 0.6,
          tickfont: { size: 9, color: '#a1a1aa' },
        },
        opacity: 0.9,
      },
      text: particlePoints.text,
      hoverinfo: 'text',
    },
  ]

  if (gbest && gbest.length >= 3 && !isNaN(gbest[0]) && !isNaN(gbest[1]) && !isNaN(gbest[2])) {
    plotData.push({
      x: [gbest[0]],
      y: [gbest[1]],
      z: [gbest[2]],
      type: 'scatter3d',
      mode: 'markers',
      name: 'Global Best',
      marker: {
        symbol: 'diamond',
        color: '#f59e0b',
        size: 9,
        line: { color: '#ffffff', width: 2 },
      },
      text: [`gbest: (${gbest[0].toFixed(3)}, ${gbest[1].toFixed(3)}, ${gbest[2].toFixed(3)})`],
      hoverinfo: 'text',
    })
  }

  const layout: Partial<Plotly.Layout> = {
    title: { text: '3D Search Space & Swarm Distribution', font: { size: 14, color: '#f5f5f4' } },
    scene: {
      xaxis: { title: { text: 'x₁', font: { size: 11, color: '#a1a1aa' } }, range: [b0[0], b0[1]] },
      yaxis: { title: { text: 'x₂', font: { size: 11, color: '#a1a1aa' } }, range: [b1[0], b1[1]] },
      zaxis: { title: { text: 'x₃', font: { size: 11, color: '#a1a1aa' } }, range: [b2[0], b2[1]] },
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.2 },
      },
    },
    legend: { orientation: 'h', y: -0.1, font: { color: '#a1a1aa', size: 11 } },
  }

  return (
    <div className={`w-full h-80 min-h-[380px] ${className ?? ''}`}>
      <PlotlyChart data={plotData} layout={layout} />
    </div>
  )
}
