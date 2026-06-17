import { useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export type Tab = {
  title: string
  value: string
  content?: ReactNode
}

type TabsProps = {
  tabs: Array<Tab>
  containerClassName?: string
  activeTabClassName?: string
  tabClassName?: string
  contentClassName?: string
}

/**
 * Aceternity-style Tabs: clicked tab moves to top of stack with 3D perspective
 * on inactive tabs. Active layoutId pill slides between tabs.
 */
export function Tabs({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
}: TabsProps) {
  const first = propTabs[0]
  if (!first) return null

  const [active, setActive] = useState<Tab>(first)
  const [tabs, setTabs] = useState<Array<Tab>>(propTabs)
  const [hovering, setHovering] = useState(false)

  function moveSelectedTabToTop(idx: number) {
    const next = [...propTabs]
    const [selected] = next.splice(idx, 1)
    if (!selected) return
    next.unshift(selected)
    setTabs(next)
    setActive(selected)
  }

  return (
    <>
      <div
        className={cn(
          'hide-scrollbar relative flex flex-row items-center justify-start gap-2 [perspective:1000px] overflow-auto sm:overflow-visible max-w-full w-full',
          containerClassName,
        )}
      >
        {propTabs.map((tab, idx) => (
          <button
            key={tab.title}
            onClick={() => moveSelectedTabToTop(idx)}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={cn(
              'relative shrink-0 px-4 py-2 rounded-full text-sm font-medium',
              tabClassName,
            )}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {active.value === tab.value && (
              <motion.div
                layoutId="active-tab-pill"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.55 }}
                className={cn(
                  'absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/20',
                  activeTabClassName,
                )}
              />
            )}
            <span
              className={cn(
                'relative block transition-colors',
                active.value === tab.value
                  ? 'text-white'
                  : 'text-muted-foreground',
              )}
            >
              {tab.title}
            </span>
          </button>
        ))}
      </div>

      <FadeInStack
        key={active.value}
        tabs={tabs}
        hovering={hovering}
        className={cn('mt-10', contentClassName)}
      />
    </>
  )
}

function FadeInStack({
  className,
  tabs,
  hovering,
}: {
  className?: string
  tabs: Array<Tab>
  hovering?: boolean
}) {
  const top = tabs[0]
  return (
    <div className="relative w-full h-full">
      {tabs.map((tab, idx) => (
        <motion.div
          key={tab.value}
          layoutId={tab.value}
          style={{
            scale: 1 - idx * 0.08,
            top: hovering ? idx * -40 : 0,
            zIndex: tabs.length - idx,
            opacity: idx < 3 ? 1 - idx * 0.15 : 0,
          }}
          animate={{ y: top && tab.value === top.value ? [0, 30, 0] : 0 }}
          className={cn(
            'w-full h-full absolute top-0 left-0',
            className,
          )}
        >
          {tab.content}
        </motion.div>
      ))}
    </div>
  )
}
