import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Item = {
  quote: string
  name: string
  title: string
}

type Props = {
  items: Array<Item>
  direction?: 'left' | 'right'
  speed?: 'fast' | 'normal' | 'slow'
  pauseOnHover?: boolean
  className?: string
}

/** Aceternity InfiniteMovingCards — duplicated list scrolling horizontally. */
export function InfiniteMovingCards({
  items,
  direction = 'left',
  speed = 'normal',
  pauseOnHover = true,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [start, setStart] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return
    // duplicate list once for seamless loop
    const items = Array.from(scrollerRef.current.children)
    items.forEach((it) => {
      const clone = it.cloneNode(true) as HTMLElement
      clone.setAttribute('aria-hidden', 'true')
      scrollerRef.current?.appendChild(clone)
    })

    const dir = direction === 'left' ? 'forwards' : 'reverse'
    const dur =
      speed === 'fast' ? '20s' : speed === 'normal' ? '40s' : '80s'

    containerRef.current.style.setProperty('--animation-direction', dir)
    containerRef.current.style.setProperty('--animation-duration', dur)
    setStart(true)
  }, [direction, speed])

  return (
    <div
      ref={containerRef}
      className={cn(
        'scroller relative z-20 max-w-full overflow-hidden',
        '[mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]',
        className,
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          'flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-4',
          start && 'animate-scroll',
          pauseOnHover && 'hover:[animation-play-state:paused]',
        )}
      >
        {items.map((it, i) => (
          <li
            key={`${it.name}-${i}`}
            className="relative w-[320px] sm:w-[420px] max-w-full shrink-0 rounded-2xl border border-white/10 bg-background px-6 py-7 overflow-hidden"
          >
            {/* neon corner glow */}
            <span
              aria-hidden
              className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-[var(--neon-magenta)] opacity-15 blur-3xl pointer-events-none"
            />
            <blockquote className="relative">
              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
                &ldquo;{it.quote}&rdquo;
              </p>
              <footer className="mt-5 flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {it.name}
                </span>
                <span className="text-xs text-muted-foreground tracking-wide">
                  {it.title}
                </span>
              </footer>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  )
}
