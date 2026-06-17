import { useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { MaskedImage } from './AnimatedHeading'
import { coachA, coachB, coachC, coachD, coachE } from '@/assets/images'

const HOVES = '"TT Hoves", "Helvetica Neue", Helvetica, Arial, sans-serif'

const team = [
  { img: coachA, role: 'STRENGTH COACH', name: 'Elias Korhonen' },
  { img: coachB, role: 'ONLINE PT', name: 'Maya Lindgren' },
  { img: coachC, role: 'PHYSIQUE COACH', name: 'Andre Silva' },
  { img: coachD, role: 'POWERLIFTING', name: 'Hana Sato' },
  { img: coachE, role: 'HYBRID COACH', name: 'Aria Vance' },
]

const GAP = 11.26
const visible = 3.25
const maxIndex = Math.max(0, Math.ceil(team.length - visible))

export function TeamCarousel({ intro }: { intro: ReactNode }) {
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex" style={{ gap: GAP }}>
        {/* intro column */}
        <div className="shrink-0" style={{ width: 324 }}>
          {intro}
        </div>

        {/* viewport */}
        <div className="relative overflow-hidden flex-1 min-w-0">
          <motion.div
            className="flex"
            style={{
              gap: GAP,
              width: `calc(${team.length} * ((100% - ${(visible - 1) * GAP}px) / ${visible}) + ${(team.length - 1) * GAP}px)`,
            }}
            animate={{
              x: `calc(${-index} * (100% + ${GAP}px) / ${team.length})`,
            }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {team.map((m, i) => (
              <div
                key={m.name}
                className="shrink-0"
                style={{
                  width: `calc((100% - ${(team.length - 1) * GAP}px) / ${team.length})`,
                  fontFamily: HOVES,
                }}
              >
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  <MaskedImage
                    src={m.img}
                    alt={m.name}
                    className="w-full h-full"
                    delay={i * 0.08}
                  />
                </div>
                <div className="pt-6">
                  <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                    {m.role}
                  </p>
                  <p className="text-xl mt-2 font-medium">{m.name}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* hover control puck */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="flex items-center justify-center gap-4 rounded-full cursor-pointer"
              style={{
                width: 126,
                height: 126,
                background: 'rgba(72, 72, 72, 0.16)',
                backdropFilter: 'blur(84px)',
                WebkitBackdropFilter: 'blur(84px)',
              }}
            >
              <button
                className="flex items-center justify-center text-white disabled:opacity-30 transition cursor-pointer"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                aria-label="Previous"
              >
                <ArrowLeft className="w-7 h-7" />
              </button>
              <button
                className="flex items-center justify-center text-white disabled:opacity-30 transition cursor-pointer"
                disabled={index >= maxIndex}
                onClick={() => setIndex((i) => Math.min(maxIndex, i + 1))}
                aria-label="Next"
              >
                <ArrowRight className="w-7 h-7" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
