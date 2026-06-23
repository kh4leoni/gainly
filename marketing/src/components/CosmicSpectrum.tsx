import { motion } from 'motion/react'

interface CosmicSpectrumProps {
  color?:
    | 'original'
    | 'blue-pink'
    | 'blue-orange'
    | 'sunset'
    | 'purple'
    | 'monochrome'
    | 'pink-purple'
    | 'blue-black'
    | 'beige-black'
}

const colorThemes = {
  original: ['#340B05', '#0358F7', '#5092C7', '#E1ECFE', '#FFD400', '#FA3D1D', '#FD02F5', '#FFC0FD'],
  'blue-pink': ['#1E3A8A', '#3B82F6', '#A855F7', '#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8', '#FDF2F8'],
  'blue-orange': ['#1E40AF', '#3B82F6', '#60A5FA', '#FFFFFF', '#FED7AA', '#FB923C', '#EA580C', '#9A3412'],
  sunset: ['#FEF3C7', '#FCD34D', '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', '#451A03'],
  purple: ['#F3E8FF', '#E9D5FF', '#D8B4FE', '#C084FC', '#A855F7', '#9333EA', '#7C3AED', '#6B21B6'],
  monochrome: ['#1A1A1A', '#404040', '#666666', '#999999', '#CCCCCC', '#E5E5E5', '#F5F5F5', '#FFFFFF'],
  'pink-purple': ['#FDF2F8', '#FCE7F3', '#F9A8D4', '#F472B6', '#EC4899', '#BE185D', '#831843', '#500724'],
  'blue-black': ['#000000', '#0F172A', '#1E293B', '#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1'],
  'beige-black': ['#FEF3C7', '#F59E0B', '#D97706', '#92400E', '#451A03', '#1C1917', '#0C0A09', '#000000'],
}

// Soft spectrum used as the footer's background. Sharp SVG bar edges are softened
// with a cheap CSS blur (no expensive SVG filter); the top is faded out with a
// mask so it bleeds into the page. The bars rise from a flat line once the footer
// scrolls into view (whileInView) — a div wrapper carries the transform because
// CSS scaleY is reliable on <div> but not on <svg>.
export function CosmicSpectrum({ color = 'original' }: CosmicSpectrumProps) {
  const c = colorThemes[color]

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-full z-0"
      style={{
        filter: 'blur(16px)',
        maskImage: 'linear-gradient(to top, black 45%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to top, black 45%, transparent 100%)',
        opacity: 0.85,
      }}
    >
      <motion.div
        className="absolute bottom-0 left-0 w-full h-[70%]"
        style={{ transformOrigin: 'bottom' }}
        initial={{ scaleY: 0.04 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ amount: 0.4 }}
        transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 1567 584"
          preserveAspectRatio="none"
          fill="none"
        >
          <g clipPath="url(#clip)">
            <path d="M1219 584H1393V184H1219V584Z" fill="url(#grad0)" />
            <path d="M1045 584H1219V104H1045V584Z" fill="url(#grad1)" />
            <path d="M348 584H174L174 184H348L348 584Z" fill="url(#grad2)" />
            <path d="M522 584H348L348 104H522L522 584Z" fill="url(#grad3)" />
            <path d="M697 584H522L522 54H697L697 584Z" fill="url(#grad4)" />
            <path d="M870 584H1045V54H870V584Z" fill="url(#grad5)" />
            <path d="M870 584H697L697 0H870L870 584Z" fill="url(#grad6)" />
            <path d="M174 585H0.000183105L-3.75875e-06 295H174L174 585Z" fill="url(#grad7)" />
            <path d="M1393 584H1567V294H1393V584Z" fill="url(#grad8)" />
          </g>
          <defs>
            {Array.from({ length: 9 }, (_, i) => (
              <linearGradient
                key={i}
                id={`grad${i}`}
                x1="50%"
                y1="100%"
                x2="50%"
                y2="0%"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor={c[0]} />
                <stop offset="0.182709" stopColor={c[1]} />
                <stop offset="0.283673" stopColor={c[2]} />
                <stop offset="0.413484" stopColor={c[3]} />
                <stop offset="0.586565" stopColor={c[4]} />
                <stop offset="0.682722" stopColor={c[5]} />
                <stop offset="0.802892" stopColor={c[6]} />
                <stop offset="1" stopColor={c[7]} stopOpacity="0" />
              </linearGradient>
            ))}
            <clipPath id="clip">
              <rect width="1567" height="584" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </motion.div>
    </div>
  )
}
