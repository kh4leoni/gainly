import { motion } from 'motion/react'
import type { ElementType, ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

export function AnimatedHeading({
  children,
  className,
  as = 'h2',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  as?: ElementType
  delay?: number
}) {
  const MotionTag = motion(as)
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  )
}

export function AnimatedText({
  children,
  className,
  delay = 0.15,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.p
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.p>
  )
}

export function MaskedImage({
  src,
  alt,
  className,
  delay = 0,
}: {
  src: string
  alt: string
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ clipPath: 'inset(100% 0 0 0)' }}
      whileInView={{ clipPath: 'inset(0% 0 0 0)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1.1, delay, ease: EASE }}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </motion.div>
  )
}
