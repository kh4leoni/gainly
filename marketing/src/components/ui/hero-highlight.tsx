import { useMotionValue, motion, useMotionTemplate } from 'motion/react'
import type { MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type HighlightProps = {
  children: ReactNode
  className?: string
}

/** Animated wipe-in marker highlight (Aceternity Highlight). */
export function Highlight({ children, className }: HighlightProps) {
  return (
    <motion.span
      initial={{ backgroundSize: '0% 100%' }}
      whileInView={{ backgroundSize: '100% 100%' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.35 }}
      style={{
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left center',
        backgroundImage:
          'linear-gradient(90deg, var(--neon-magenta), var(--neon-violet), var(--neon-cyan))',
        WebkitBoxDecorationBreak: 'clone',
        boxDecorationBreak: 'clone',
      }}
      className={cn(
        'relative inline px-2 -mx-1 py-0.5 rounded-md',
        className,
      )}
    >
      {children}
    </motion.span>
  )
}

type HeroHighlightProps = {
  children: ReactNode
  className?: string
  containerClassName?: string
}

/** Container with dotted-grid background that radial-follows the cursor. */
export function HeroHighlight({
  children,
  className,
  containerClassName,
}: HeroHighlightProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  const dotsMask = useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`

  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn(
        'relative flex items-center justify-center w-full group',
        containerClassName,
      )}
    >
      {/* Base dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      {/* Bright dot grid masked under cursor */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          backgroundImage:
            'radial-gradient(var(--neon-magenta) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          WebkitMaskImage: dotsMask,
          maskImage: dotsMask,
        }}
      />
      <div className={cn('relative z-10', className)}>{children}</div>
    </div>
  )
}
