import { useMemo } from 'react'
import type { Particle } from '@/algorithms/pso/types'
import { PlotlyChart } from '@/components/ui/PlotlyChart'

export interface ContourPlotProps {
  bounds: [number, number][]
  evaluate: (pos: number[]) => number
  particles: Particle[]
  gbest: number[] | null
  className?: string
}

export function ContourPlot({ bounds, evaluate, particles, gbest, className }: ContourPlotProps) {
  const b0 = bounds[0] ?? [-5, 5]
  const b1 = bounds[1] ?? [-5, 5]

  // Precompute 2D grid
  const { xs, ys, zGrid } = useMemo(() => {
    const resolution = 40
    const [minX, maxX] = b0
    const [minY, maxY] = b1

    const stepX = (maxX - minX) / (resolution - 1)
    const stepY = (maxY - minY) / (resolution - 1)

    const xsArr: number[] = []
    const ysArr: number[] = []

    for (let i = 0; i < resolution; i++) {
      xsArr.push(minX + i * stepX)
      ysArr.push(minY + i * stepY)
    }

    const grid: number[][] = []
    for (let j = 0; j < resolution; j++) {
      const row: number[] = []
      const y = ysArr[j]
      for (let i = 0; i < resolution; i++) {
        const x = xsArr[i]
        try {
          const val = evaluate([x, y])
          row.push(val)
        } catch {
          row.push(NaN)
        }
      }
      grid.push(row)
    }

    return { xs: xsArr, ys: ysArr, zGrid: grid }
  }, [b0[0], b0[1], b1[0], b1[1], evaluate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Extract particle 2D coordinates
  const particlePoints = useMemo(() => {
    const px: number[] = []
    const py: number[] = []
    const text: string[] = []

    particles.forEach((p, idx) => {
      const x = p.position[0]
      const y = p.position[1]
      if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
        px.push(x)
        py.push(y)
        text.push(`Particle ${idx + 1}: (${x.toFixed(3)}, ${y.toFixed(3)})`)
      }
    })

    return { px, py, text }
  }, [particles])

  const plotData: Plotly.Data[] = [
    {
      z: zGrid,
      x: xs,
      y: ys,
      type: 'contour',
      colorscale: 'Viridis',
      contours: {
        coloring: 'heatmap',
        showlabels: true,
        labelfont: { size: 10, color: '#f8fafc' },
      },
      colorbar: {
        title: { text: 'f(x₁, x₂)', font: { size: 11, color: '#94a3b8' } },
        thickness: 14,
        len: 0.85,
        tickfont: { size: 10, color: '#94a3b8' },
      },
      hoverinfo: 'x+y+z',
      name: 'Contour',
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
        line: { color: '#090d16', width: 1.5 },
      },
      text: particlePoints.text,
      hoverinfo: 'text',
    },
  ]

  if (gbest && gbest.length >= 2 && !isNaN(gbest[0]) && !isNaN(gbest[1])) {
    plotData.push({
      x: [gbest[0]],
      y: [gbest[1]],
      type: 'scatter',
      mode: 'markers',
      name: 'Global Best (gbest)',
      marker: {
        symbol: 'star',
        color: '#f59e0b',
        size: 16,
        line: { color: '#ffffff', width: 2 },
      },
      text: [`gbest: (${gbest[0].toFixed(4)}, ${gbest[1].toFixed(4)})`],
      hoverinfo: 'text',
    })
  }

  const layout: Partial<Plotly.Layout> = {
    title: { text: '2D Contour Map & Swarm Positions', font: { size: 14, color: '#f8fafc' } },
    xaxis: {
      title: { text: 'x₁', font: { size: 12, color: '#94a3b8' } },
      range: [b0[0], b0[1]],
      gridcolor: '#334155',
      zerolinecolor: '#475569',
    },
    yaxis: {
      title: { text: 'x₂', font: { size: 12, color: '#94a3b8' } },
      range: [b1[0], b1[1]],
      gridcolor: '#334155',
      zerolinecolor: '#475569',
    },
    legend: { orientation: 'h', y: -0.2, font: { color: '#94a3b8', size: 11 } },
  }

  return (
    <div className={`w-full h-80 min-h-[360px] ${className ?? ''}`}>
      <PlotlyChart data={plotData} layout={layout} />
    </div>
  )
}
