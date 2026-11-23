import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { ConvergencePoint } from '@/simulation/types'

export interface ConvergenceChartProps {
  history: ConvergencePoint[]
  objectiveName?: string
  className?: string
}

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({
  history,
  objectiveName = 'Best Objective Value',
  className,
}) => {
  if (!history || history.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        No convergence data recorded yet.
      </div>
    )
  }

  // Format data for Recharts
  const data = history.map((pt) => ({
    iteration: pt.iteration,
    value: pt.objectiveValue,
  }))

  return (
    <div className={`w-full h-72 ${className ?? ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis
            dataKey="iteration"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={{ stroke: '#64748b' }}
            label={{
              value: 'Iteration',
              position: 'insideBottom',
              offset: -10,
              fontSize: 12,
              fill: '#94a3b8',
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={{ stroke: '#64748b' }}
            domain={['auto', 'auto']}
            tickFormatter={(val: number) =>
              Math.abs(val) >= 1000 || (Math.abs(val) < 0.01 && val !== 0)
                ? val.toExponential(2)
                : val.toFixed(2)
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              borderColor: '#334155',
              borderRadius: '0.375rem',
              color: '#f8fafc',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
            // @ts-expect-error - Recharts Tooltip Formatter signature flexibility
            formatter={(value: number | string | undefined) => [
              typeof value === 'number' ? value.toPrecision(6) : value ?? '',
              objectiveName,
            ]}
            labelFormatter={(label) => `Iteration ${label}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={history.length <= 30 ? { r: 3, fill: '#a78bfa' } : false}
            activeDot={{ r: 5, fill: '#c084fc' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

