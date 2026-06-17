import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type NoiseBackgroundProps = {
  children: ReactNode
  containerClassName?: string
  className?: string
  gradientColors?: Array<string>
  duration?: number
}

/**
 * Aceternity-style animated noise background:
 * rotating conic gradient + SVG turbulence overlay.
 */
export function NoiseBackground({
  children,
  containerClassName,
  className,
  gradientColors = ['#ff2d95', '#00f5ff', '#8338ec'],
  duration = 4,
}: NoiseBackgroundProps) {
  const colors = [...gradientColors, gradientColors[0]].join(', ')

  return (
    <div
      className={cn('relative isolate', containerClassName)}
      style={{ ['--noise-duration' as never]: `${duration}s` }}
    >
      {/* rotating conic gradient border */}
      <div
        aria-hidden
        className="noise-rotate absolute inset-0 rounded-[inherit]"
        style={{
          background: `conic-gradient(from var(--noise-angle), ${colors})`,
        }}
      />
      {/* SVG turbulence noise overlay */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[inherit] mix-blend-overlay opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className={cn('relative', className)}>{children}</div>
    </div>
  )
}
