import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AnimatePresence,
  motion,
  useScroll,
  useMotionValueEvent,
} from 'motion/react'
import { cn } from '@/lib/utils'

export type FloatingNavItem = {
  name: string
  link: string
  icon?: ReactNode
}

type Props = {
  navItems: Array<FloatingNavItem>
  className?: string
}

/**
 * Aceternity FloatingNav — centered floating pill that hides on scroll-down,
 * reappears on scroll-up. Stays visible at top of page.
 */
export function FloatingNav({ navItems, className }: Props) {
  const { scrollY } = useScroll()
  const [visible, setVisible] = useState(true)

  useMotionValueEvent(scrollY, 'change', (current) => {
    const prev = scrollY.getPrevious() ?? 0
    const direction = current - prev
    if (current < 80) {
      setVisible(true)
      return
    }
    if (direction < 0) setVisible(true)
    else setVisible(false)
  })

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 1, y: -100 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed top-6 left-1/2 -translate-x-1/2 z-[55]',
          'flex max-w-fit items-center gap-1',
          'rounded-full border border-white/15 bg-black/70 backdrop-blur-xl',
          'px-2 py-2 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)]',
          className,
        )}
      >
        {navItems.map((item, i) => (
          <a
            key={`nav-${i}`}
            href={item.link}
            className="relative flex items-center gap-2 px-4 py-2 text-sm rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            {item.icon && (
              <span className="block sm:hidden">{item.icon}</span>
            )}
            <span className="hidden sm:block">{item.name}</span>
          </a>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
