import { useEffect, useState } from 'react'
import { Menu, X, Home, Sparkles, Tag, Mail } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { FloatingNav } from '@/components/ui/floating-navbar'

const NAV_ITEMS = ['Etusivu', 'Ominaisuudet', 'Hinnoittelu', 'Yhteys']

const FLOATING_NAV_ITEMS = [
  { name: 'Etusivu', link: '#', icon: <Home className="h-4 w-4" /> },
  {
    name: 'Ominaisuudet',
    link: '#features',
    icon: <Sparkles className="h-4 w-4" />,
  },
  { name: 'Hinnoittelu', link: '#pricing', icon: <Tag className="h-4 w-4" /> },
  { name: 'Yhteys', link: '#contact', icon: <Mail className="h-4 w-4" /> },
]

export function Header() {
  const [open, setOpen] = useState(false)

  // Lock scroll when overlay open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  return (
    <>
      {/* Progressive blur strip behind header — 20/40/60/80% bands */}
      <div className="fixed top-0 inset-x-0 h-20 z-40 pointer-events-none">
        {[
          { blur: 2, stop: 20 },
          { blur: 6, stop: 40 },
          { blur: 12, stop: 60 },
          { blur: 24, stop: 80 },
        ].map(({ blur, stop }) => {
          const mask = `linear-gradient(to bottom, black 0%, black ${stop}%, transparent 100%)`
          return (
            <div
              key={blur}
              className="absolute inset-0"
              style={{
                backdropFilter: `blur(${blur}px)`,
                WebkitBackdropFilter: `blur(${blur}px)`,
                maskImage: mask,
                WebkitMaskImage: mask,
              }}
            />
          )
        })}
      </div>

      <header
        className="fixed left-0 right-0 z-50 px-4 sm:px-8 flex items-center justify-between pointer-events-none"
        style={{ top: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        <img
          src="/logo.png"
          alt="Gainly"
          className="h-20 sm:h-20 md:h-20 w-auto pointer-events-auto"
        />

        {/* Mobile hamburger button */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Avaa valikko"
          className="md:hidden h-12 w-12 grid place-items-center rounded-full backdrop-blur-md text-white pointer-events-auto"
          style={{ background: 'var(--header-bg)' }}
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Desktop floating nav — centered, hides on scroll-down */}
      <div className="hidden md:block">
        <FloatingNav navItems={FLOATING_NAV_ITEMS} />
      </div>

      {/* Mobile full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-2xl md:hidden flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* atmospheric glows inside overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,45,149,0.25),transparent_55%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,245,255,0.15),transparent_60%)] pointer-events-none" />

            {/* Close header */}
            <div className="relative flex items-center justify-between px-4 pt-4">
              <img src="/logo.png" alt="Gainly" className="h-20 w-auto" />
              <button
                onClick={() => setOpen(false)}
                aria-label="Sulje valikko"
                className="h-12 w-12 grid place-items-center rounded-full bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav stack */}
            <nav className="relative flex-1 flex flex-col justify-center gap-2 px-6">
              {NAV_ITEMS.map((item, i) => (
                <motion.a
                  key={item}
                  href="#"
                  onClick={() => setOpen(false)}
                  className="block text-5xl font-medium text-white tracking-[-0.02em] border-b border-white/10 py-5"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.1 + i * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {item}
                </motion.a>
              ))}
            </nav>

            {/* CTA at bottom */}
            <div className="relative px-6 pb-10 flex flex-col gap-3">
              <a
                href="#"
                className="rounded-full bg-white text-black text-center py-4 font-medium"
              >
                Kokeile ilmaiseksi →
              </a>
              <a
                href="#"
                className="rounded-full border border-white/20 text-white text-center py-4"
              >
                Varaa esittely
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
