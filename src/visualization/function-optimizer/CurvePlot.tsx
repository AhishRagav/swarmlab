import { useMemo } from 'react'
import type { Particle } from '@/algorithms/pso/types'
import { PlotlyChart } from '@/components/ui/PlotlyChart'

export interface CurvePlotProps {
  bounds: [number, number]
  evaluate: (pos: number[]) => number
  particles: Particle[]
  gbest: number[] | null
  className?: string
}

export function CurvePlot({ bounds, evaluate, particles, gbest, className }: CurvePlotProps) {
  // Sample curve across the 1D search space
  const { xs, ys } = useMemo(() => {
    const numPoints = 150
    const [min, max] = bounds ?? [-5.12, 5.12]
    const step = (max - min) / (numPoints - 1)
    const xsArr: number[] = []
    const ysArr: number[] = []

    for (let i = 0; i < numPoints; i++) {
      const x = min + i * step
      xsArr.push(x)
      try {
        const val = evaluate([x])
        ysArr.push(val)
      } catch {
        ysArr.push(NaN)
      }
    }
    return { xs: xsArr, ys: ysArr }
  }, [bounds, evaluate])

  // Extract particle coordinates and evaluated objectives
  const particlePoints = useMemo(() => {
    const px: number[] = []
    const py: number[] = []
    const text: string[] = []

    particles.forEach((p, i) => {
      const x = p.position[0]
      if (typeof x === 'number' && !isNaN(x)) {
        px.push(x)
        try {
          const val = evaluate(p.position)
          py.push(val)
        } catch {
          py.push(p.pbestObjective)
        }
        text.push(`Particle ${i + 1}: x = ${x.toFixed(4)}`)
      }
    })

    return { px, py, text }
  }, [particles, evaluate])

  // Best point coordinates
  const gbestPoint = useMemo(() => {
    if (!gbest || gbest.length === 0 || isNaN(gbest[0])) return null
    try {
      const val = evaluate(gbest)
      return { x: gbest[0], y: val }
    } catch {
      return null
    }
  }, [gbest, evaluate])

  const plotData: Plotly.Data[] = [
    {
      x: xs,
      y: ys,
      type: 'scatter',
      mode: 'lines',
      name: 'Objective Function f(x)',
      line: { color: '#f59e0b', width: 2.5 },
      hoverinfo: 'x+y',
    },
    {
      x: particlePoints.px,
      y: particlePoints.py,
      type: 'scatter',
      mode: 'markers',
      name: 'Particles',
      marker: {
        color: '#ffffff',
        size: 8,
        line: { color: '#111315', width: 1.5 },
      },
      text: particlePoints.text,
      hoverinfo: 'text+y',
    },
  ]

  if (gbestPoint) {
    plotData.push({
      x: [gbestPoint.x],
      y: [gbestPoint.y],
      type: 'scatter',
      mode: 'markers',
      name: 'Global Best (gbest)',
      marker: {
        symbol: 'star',
        color: '#f59e0b',
        size: 16,
        line: { color: '#ffffff', width: 1.5 },
      },
      hoverinfo: 'x+y',
    })
  }

  const layout: Partial<Plotly.Layout> = {
    title: { text: '1D Function Curve & Swarm Positions', font: { size: 14, color: '#f5f5f4' } },
    xaxis: {
      title: { text: 'x₁', font: { size: 12, color: '#a1a1aa' } },
      range: [bounds?.[0] ?? -5.12, bounds?.[1] ?? 5.12],
      gridcolor: '#3f454d',
      zerolinecolor: '#525b66',
    },
    yaxis: {
      title: { text: 'f(x₁)', font: { size: 12, color: '#a1a1aa' } },
      gridcolor: '#3f454d',
      zerolinecolor: '#525b66',
    },
    legend: { orientation: 'h', y: -0.2, font: { color: '#a1a1aa', size: 11 } },
  }

  return (
    <div className={`w-full h-80 min-h-[320px] ${className ?? ''}`}>
      <PlotlyChart data={plotData} layout={layout} />
    </div>
  )
}
