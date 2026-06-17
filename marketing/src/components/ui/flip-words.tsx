import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'

type FlipWordsProps = {
  words: Array<string>
  duration?: number
  className?: string
}

/**
 * FlipWords — cycles a list of words with blur-in/blur-out.
 * Animates the whole word as a single span so background-clip: text
 * (e.g. .neon-text gradient) renders correctly.
 */
export function FlipWords({
  words,
  duration = 3000,
  className,
}: FlipWordsProps) {
  const [index, setIndex] = useState(0)

  const tick = useCallback(() => {
    setIndex((i) => (i + 1) % words.length)
  }, [words.length])

  useEffect(() => {
    const t = setTimeout(tick, duration)
    return () => clearTimeout(t)
  }, [index, duration, tick])

  const current = words[index] ?? words[0] ?? ''

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={current}
        initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn('inline-block whitespace-nowrap', className)}
      >
        {current}
      </motion.span>
    </AnimatePresence>
  )
}
