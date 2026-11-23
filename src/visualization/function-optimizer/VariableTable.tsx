export interface VariableTableProps {
  dimensions: number
  bounds: [number, number][]
  gbest: number[] | null
  className?: string
}

export function VariableTable({ dimensions, bounds, gbest, className }: VariableTableProps) {
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Variable Coordinate Distribution ({dimensions} Dimensions)
        </h4>
        <span className="text-[11px] text-muted-foreground">
          Normalized position in search range [min, max]
        </span>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-secondary/20">
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-secondary/60 text-muted-foreground sticky top-0 font-medium">
              <tr>
                <th className="py-1.5 px-3">Variable</th>
                <th className="py-1.5 px-3">Bounds [min, max]</th>
                <th className="py-1.5 px-3">Best Value (gbest)</th>
                <th className="py-1.5 px-3 w-40">Relative Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {Array.from({ length: dimensions }, (_, i) => {
                const b = bounds[i] ?? [-5.12, 5.12]
                const val = gbest && !isNaN(gbest[i]) ? gbest[i] : null
                const range = b[1] - b[0]
                const pct =
                  val !== null && range > 0
                    ? Math.max(0, Math.min(100, ((val - b[0]) / range) * 100))
                    : 50

                return (
                  <tr key={i} className="hover:bg-accent/30">
                    <td className="py-1.5 px-3 font-semibold text-foreground">x{i + 1}</td>
                    <td className="py-1.5 px-3 text-muted-foreground">
                      [{b[0].toFixed(2)}, {b[1].toFixed(2)}]
                    </td>
                    <td className="py-1.5 px-3 font-semibold text-primary">
                      {val !== null ? val.toFixed(5) : '—'}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden flex items-center">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-200"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
