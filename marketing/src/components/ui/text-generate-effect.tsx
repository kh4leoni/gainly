import { useEffect } from 'react'
import { motion, stagger, useAnimate, useInView } from 'motion/react'
import { cn } from '@/lib/utils'

type Props = {
  words: string
  className?: string
  filter?: boolean
  duration?: number
  staggerDelay?: number
}

/**
 * Aceternity TextGenerateEffect — words appear with blur fade-in, triggered
 * when element enters viewport (so it works in long-scroll layouts).
 */
export function TextGenerateEffect({
  words,
  className,
  filter = true,
  duration = 0.5,
  staggerDelay = 0.05,
}: Props) {
  const [scope, animate] = useAnimate()
  const inView = useInView(scope, { once: true, margin: '-60px' })
  const wordsArray = words.split(' ')

  useEffect(() => {
    if (inView) {
      animate(
        'span',
        {
          opacity: 1,
          filter: filter ? 'blur(0px)' : 'none',
        },
        {
          duration,
          delay: stagger(staggerDelay),
        },
      )
    }
  }, [inView, animate, duration, filter, staggerDelay])

  return (
    <motion.p ref={scope} className={cn(className)}>
      {wordsArray.map((word, i) => (
        <span key={`${word}-${i}`}>
          <motion.span
            className="inline-block opacity-0"
            style={{ filter: filter ? 'blur(10px)' : 'none' }}
          >
            {word}
          </motion.span>
          {i < wordsArray.length - 1 ? ' ' : ''}
        </span>
      ))}
    </motion.p>
  )
}
