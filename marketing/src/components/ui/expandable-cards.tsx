import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { useOutsideClick } from '@/hooks/use-outside-click'

export type ExpandableCard = {
  icon: LucideIcon
  color: string
  title: string
  desc: string
  content: string
}

const CloseIcon = () => (
  <motion.svg
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.05 } }}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </motion.svg>
)

export function ExpandableCards({ cards }: { cards: Array<ExpandableCard> }) {
  const [active, setActive] = useState<ExpandableCard | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)
  const id = useId()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActive(null)
    }
    if (active) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  useOutsideClick(ref, () => setActive(null))

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
        )}
      </AnimatePresence>

      {/* Expanded modal */}
      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 grid place-items-center z-[70] p-4">
            <motion.button
              key={`close-${active.title}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              onClick={() => setActive(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 grid place-items-center bg-white text-black rounded-full h-9 w-9 z-10"
              aria-label="Sulje"
            >
              <CloseIcon />
            </motion.button>

            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="w-full max-w-lg max-h-[90vh] flex flex-col bg-[#101010] ring-1 ring-white/10 rounded-3xl overflow-hidden"
            >
              {/* Icon hero */}
              <motion.div
                layoutId={`icon-${active.title}-${id}`}
                className="relative h-48 grid place-items-center overflow-hidden shrink-0"
                style={{
                  background: `radial-gradient(ellipse at center, ${active.color}40, transparent 70%)`,
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    mixBlendMode: 'overlay',
                  }}
                />
                <active.icon
                  className="w-20 h-20 relative"
                  style={{
                    color: active.color,
                    filter: `drop-shadow(0 0 28px ${active.color})`,
                  }}
                />
              </motion.div>

              <div className="p-6 sm:p-8 flex flex-col gap-4 overflow-y-auto">
                <motion.h3
                  layoutId={`title-${active.title}-${id}`}
                  className="text-2xl font-medium"
                >
                  {active.title}
                </motion.h3>
                <motion.p
                  layoutId={`desc-${active.title}-${id}`}
                  className="text-sm text-muted-foreground leading-relaxed"
                >
                  {active.desc}
                </motion.p>
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-base text-foreground/85 leading-relaxed mt-2"
                >
                  {active.content}
                </motion.div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* List */}
      <ul className="max-w-3xl mx-auto w-full flex flex-col gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <motion.li
              layoutId={`card-${card.title}-${id}`}
              key={`card-${card.title}-${id}`}
              onClick={() => setActive(card)}
              className="group relative flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-white/10 bg-background hover:bg-white/[0.04] cursor-pointer transition-colors overflow-hidden"
              style={{ ['--card-glow' as never]: card.color }}
            >
              {/* neon bar */}
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
                style={{
                  background: card.color,
                  boxShadow: `0 0 18px ${card.color}`,
                }}
              />

              <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                <motion.div
                  layoutId={`icon-${card.title}-${id}`}
                  className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl grid place-items-center overflow-hidden"
                  style={{
                    background: `radial-gradient(ellipse at center, ${card.color}30, transparent 75%)`,
                  }}
                >
                  <Icon
                    className="w-6 h-6 sm:w-7 sm:h-7"
                    style={{
                      color: card.color,
                      filter: `drop-shadow(0 0 10px ${card.color})`,
                    }}
                  />
                </motion.div>

                <div className="min-w-0">
                  <motion.h3
                    layoutId={`title-${card.title}-${id}`}
                    className="text-base sm:text-lg font-medium leading-tight"
                  >
                    {card.title}
                  </motion.h3>
                  <motion.p
                    layoutId={`desc-${card.title}-${id}`}
                    className="text-xs sm:text-sm text-muted-foreground leading-snug mt-1 line-clamp-2"
                  >
                    {card.desc}
                  </motion.p>
                </div>
              </div>

              <motion.button
                className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-full font-medium bg-white/10 text-white group-hover:bg-white group-hover:text-black transition-colors"
              >
                Tutustu →
              </motion.button>
            </motion.li>
          )
        })}
      </ul>
    </>
  )
}
