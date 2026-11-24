import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onChange, min = 0, max = 100, step = 1, style, ...props }, ref) => {
    const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))

    return (
      <input
        type="range"
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--color-primary, #f59e0b) 0%, var(--color-primary, #f59e0b) ${percentage}%, var(--color-border, #3f454d) ${percentage}%, var(--color-border, #3f454d) 100%)`,
          ...style,
        }}
        className={cn(
          'speed-slider w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className
        )}
        {...props}
      />
    )
  }
)
Slider.displayName = 'Slider'
