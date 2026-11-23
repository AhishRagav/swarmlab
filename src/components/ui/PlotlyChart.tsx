import { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-dist-min'

export interface PlotlyChartProps {
  data: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
  className?: string
  style?: React.CSSProperties
}

export function PlotlyChart({ data, layout, config, className, style }: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const defaultLayout: Partial<Plotly.Layout> = {
      autosize: true,
      margin: { l: 50, r: 30, t: 30, b: 50 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'system-ui, -apple-system, sans-serif',
        size: 12,
        color: '#94a3b8',
      },
      ...layout,
    }

    const defaultConfig: Partial<Plotly.Config> = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      ...config,
    }

    Plotly.react(el, data, defaultLayout, defaultConfig)

    const handleResize = () => {
      if (el) {
        Plotly.Plots.resize(el)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (el) {
        Plotly.purge(el)
      }
    }
  }, [data, layout, config])

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }} />
}
