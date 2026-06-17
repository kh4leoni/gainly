import React from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

const NEON_COLORS = [
  '#ff2d95',
  '#ff006e',
  '#ff6b00',
  '#ffd60a',
  '#39ff14',
  '#00f5ff',
  '#3a86ff',
  '#8338ec',
]

function randomColor() {
  return NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]
}

type Props = {
  className?: string
}

function BoxesCore({ className }: Props) {
  const rows = new Array(80).fill(0)
  const cols = new Array(100).fill(0)

  return (
    <div
      style={{
        transform: `skewX(-48deg) skewY(14deg) scale(0.675) translateZ(0)`,
        transformOrigin: 'center center',
      }}
      className={cn(
        'absolute -inset-[100%] flex z-0',
        className,
      )}
    >
      {rows.map((_, i) => (
        <motion.div
          key={`row-${i}`}
          className="w-16 h-8 border-l border-white/[0.06] relative"
        >
          {cols.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: randomColor(),
                transition: { duration: 0 },
              }}
              animate={{ transition: { duration: 2 } }}
              key={`col-${j}`}
              className="w-16 h-8 border-r border-t border-white/[0.06] relative"
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="absolute h-6 w-10 -top-[14px] -left-[22px] text-white/10 stroke-[1px] pointer-events-none"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m6-6H6"
                  />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </motion.div>
      ))}
    </div>
  )
}

export const Boxes = React.memo(BoxesCore)
