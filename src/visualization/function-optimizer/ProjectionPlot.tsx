import { useState, useMemo } from 'react'
import type { Particle } from '@/algorithms/pso/types'
import { PlotlyChart } from '@/components/ui/PlotlyChart'
import { Select } from '@/components/ui/Select'

export interface ProjectionPlotProps {
  dimensions: number
  bounds: [number, number][]
  evaluate: (pos: number[]) => number
  particles: Particle[]
  gbest: number[] | null
  className?: string
}

export function ProjectionPlot({
  dimensions,
  bounds,
  evaluate,
  particles,
  gbest,
  className,
}: ProjectionPlotProps) {
  const [axisX, setAxisX] = useState<number>(0)
  const [axisY, setAxisY] = useState<number>(1)

  const bX = bounds[axisX] ?? [-5, 5]
  const bY = bounds[axisY] ?? [-5, 5]

  // Construct dimension options for selector
  const dimOptions = useMemo(() => {
    return Array.from({ length: dimensions }, (_, i) => ({
      value: String(i),
      label: `Dimension x${i + 1}`,
    }))
  }, [dimensions])

  // Baseline position for sliced contour: use gbest or midpoints
  const baseline = useMemo(() => {
    return Array.from({ length: dimensions }, (_, i) => {
      if (gbest && !isNaN(gbest[i])) return gbest[i]
      const b = bounds[i] ?? [-5, 5]
      return (b[0] + b[1]) / 2
    })
  }, [dimensions, bounds, gbest])

  // 2D slice contour grid for selected axes (axisX, axisY)
  const { xs, ys, zGrid } = useMemo(() => {
    const resolution = 32
    const [minX, maxX] = bX
    const [minY, maxY] = bY

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
        const probe = [...baseline]
        probe[axisX] = x
        probe[axisY] = y
        try {
          const val = evaluate(probe)
          row.push(val)
        } catch {
          row.push(NaN)
        }
      }
      grid.push(row)
    }

    return { xs: xsArr, ys: ysArr, zGrid: grid }
  }, [bX[0], bX[1], bY[0], bY[1], axisX, axisY, baseline, evaluate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Extract projected particles
  const particlePoints = useMemo(() => {
    const px: number[] = []
    const py: number[] = []
    const text: string[] = []

    particles.forEach((p, idx) => {
      const x = p.position[axisX]
      const y = p.position[axisY]
      if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
        px.push(x)
        py.push(y)
        text.push(`Particle ${idx + 1}: x${axisX + 1}=${x.toFixed(2)}, x${axisY + 1}=${y.toFixed(2)}`)
      }
    })

    return { px, py, text }
  }, [particles, axisX, axisY])

  const plotData: Plotly.Data[] = [
    {
      z: zGrid,
      x: xs,
      y: ys,
      type: 'contour',
      colorscale: 'Viridis',
      contours: { coloring: 'heatmap', showlabels: false },
      colorbar: {
        title: { text: `f(x${axisX + 1}, x${axisY + 1} | gbest)`, font: { size: 10, color: '#94a3b8' } },
        thickness: 12,
        len: 0.8,
        tickfont: { size: 9, color: '#94a3b8' },
      },
      hoverinfo: 'x+y+z',
      name: 'Slice Contour',
    },
    {
      x: particlePoints.px,
      y: particlePoints.py,
      type: 'scatter',
      mode: 'markers',
      name: 'Projected Particles',
      marker: {
        color: '#ffffff',
        size: 7,
        line: { color: '#090d16', width: 1.5 },
      },
      text: particlePoints.text,
      hoverinfo: 'text',
    },
  ]

  if (
    gbest &&
    gbest.length > Math.max(axisX, axisY) &&
    !isNaN(gbest[axisX]) &&
    !isNaN(gbest[axisY])
  ) {
    plotData.push({
      x: [gbest[axisX]],
      y: [gbest[axisY]],
      type: 'scatter',
      mode: 'markers',
      name: 'Global Best',
      marker: {
        symbol: 'star',
        color: '#f59e0b',
        size: 15,
        line: { color: '#ffffff', width: 1.5 },
      },
      text: [`gbest: x${axisX + 1}=${gbest[axisX].toFixed(3)}, x${axisY + 1}=${gbest[axisY].toFixed(3)}`],
      hoverinfo: 'text',
    })
  }

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: `2D Projection (x${axisX + 1} vs x${axisY + 1}) with Other Dimensions Fixed at gbest`,
      font: { size: 13, color: '#f8fafc' },
    },
    xaxis: {
      title: { text: `x${axisX + 1}`, font: { size: 12, color: '#94a3b8' } },
      range: [bX[0], bX[1]],
      gridcolor: '#334155',
      zerolinecolor: '#475569',
    },
    yaxis: {
      title: { text: `x${axisY + 1}`, font: { size: 12, color: '#94a3b8' } },
      range: [bY[0], bY[1]],
      gridcolor: '#334155',
      zerolinecolor: '#475569',
    },
    legend: { orientation: 'h', y: -0.22, font: { color: '#94a3b8', size: 11 } },
  }

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {/* Axis Selection Bar */}
      <div className="flex items-center gap-4 bg-secondary/50 p-2.5 rounded-md border border-border text-xs">
        <span className="font-semibold text-muted-foreground uppercase tracking-wider">
          Projection Slice:
        </span>
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground">X-Axis:</label>
          <Select
            value={String(axisX)}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (val !== axisY) setAxisX(val)
            }}
            options={dimOptions}
            className="w-36 text-xs h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-muted-foreground">Y-Axis:</label>
          <Select
            value={String(axisY)}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (val !== axisX) setAxisY(val)
            }}
            options={dimOptions}
            className="w-36 text-xs h-8"
          />
        </div>
      </div>

      <div className="w-full h-80 min-h-[350px]">
        <PlotlyChart data={plotData} layout={layout} />
      </div>
    </div>
  )
}
