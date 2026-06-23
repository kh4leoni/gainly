import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  WifiOff,
  Dumbbell,
  Trophy,
  MessageCircle,
  Apple,
  Smartphone,
  Scale,
  Check,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Header } from '@/components/Header'
import { Spotlight } from '@/components/Spotlight'
import { NoiseBackground } from '@/components/ui/noise-background'
import { FlipWords } from '@/components/ui/flip-words'
import { cn } from '@/lib/utils'
import { Highlight } from '@/components/ui/hero-highlight'
import { InfiniteMovingCards } from '@/components/ui/infinite-moving-cards'
import { Boxes } from '@/components/ui/background-boxes'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { AnimatedHeading, AnimatedText } from '@/components/AnimatedHeading'
import { CosmicSpectrum } from '@/components/CosmicSpectrum'
import {
  heroPhoto,
  benefitProgramming,
  benefitProgress,
  benefitMessaging,
} from '@/assets/images'

export const Route = createFileRoute('/')({ component: Home })

const HOVES = '"Satoshi", "Helvetica Neue", Helvetica, Arial, sans-serif'

function Home() {
  return (
    <div className="bg-black lg:bg-background text-foreground">
      <Header />
      <main className="flex flex-col gap-2 lg:gap-0 pt-32 lg:pt-0">
        <Hero />
        <SectionBlend from="#0a0a0a" to="#1a1a1a" />
        <WhyGainlySection />
        <SectionBlend from="#1a1a1a" to="#141414" />
        <ClientFeaturesSection />
        <SectionBlend from="#141414" to="#1a1a1a" />
        <BenefitsSection />
        <TestimonialsSection />
        <SectionBlend from="#1a1a1a" to="#141414" />
        <PricingSection />
        <SectionBlend from="#141414" to="#1a1a1a" className="h-64" />
        <ClosingCTASection />
        <SectionBlend from="#1a1a1a" to="#0a0a0a" className="h-64" />
      </main>
      <Footer />
    </div>
  )
}

/* Desktop-only seam softener: a flush gradient band that ramps between two
   adjacent section colors. Its endpoints match each neighbour's bg exactly, so
   the two hard seams become one smooth transition. On mobile the sections are
   separate rounded cards (.mobile-card), so no blend is shown. */
function SectionBlend({
  from,
  to,
  className = 'h-32',
}: {
  from: string
  to: string
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none hidden lg:block ${className}`}
      style={{ background: `linear-gradient(to bottom, ${from}, ${to})` }}
    />
  )
}

/* ======================= FOOTER ======================= */
function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0a0a0a] min-h-[60vh] flex flex-col justify-end">
      {/* Spectrum glow fills the footer, content sits at the bottom edge */}
      <CosmicSpectrum />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-8 md:px-12 pb-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between pb-10">
          <img src="/logo.png" alt="Gainly" className="h-16 w-auto" />
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors">
              Ominaisuudet
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Hinnoittelu
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              Yhteys
            </a>
          </nav>
        </div>
        <div className="border-t border-white/10 py-8 text-xs text-white/40">
          © {new Date().getFullYear()} Gainly — Valmennusalusta
        </div>
      </div>
    </footer>
  )
}

/* ========================= HERO ========================= */
function LaptopMockup({ src, alt }: { src: string; alt: string }) {
  const EASE = [0.16, 1, 0.3, 1] as const
  return (
    <motion.div
      className="relative w-full"
      style={{ perspective: '2400px' }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      {/* Neon backlight — sits behind the top edge of the laptop and spills to the
          sides, so it haloes the machine without washing color across its face */}
      <div
        aria-hidden
        className="absolute -inset-x-24 -top-16 bottom-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,45,149,0.22),transparent_60%)] blur-3xl -z-10"
      />

      {/* Lid — 3D open animation, rotates from closed to upright */}
      <motion.div
        className="relative rounded-[18px] bg-zinc-800 p-[0.6%] pt-[0.9%] shadow-[0_50px_100px_-25px_rgba(0,0,0,0.75)] ring-1 ring-white/10"
        style={{
          transformOrigin: 'bottom center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        }}
        initial={{ rotateX: -92 }}
        animate={{ rotateX: 0 }}
        transition={{ duration: 1.5, delay: 0.5, ease: EASE }}
      >
        {/* Camera notch */}
        <div className="absolute top-[0.4%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-600" />
        {/* Screen */}
        <div className="relative rounded-[10px] overflow-hidden bg-zinc-950">
          <img src={src} alt={alt} className="block w-full h-auto" />
          {/* Screen "power on" — dark veil fades out as lid finishes opening */}
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 1.7, ease: 'easeOut' }}
          />
          {/* Glare sweep across screen as it powers on */}
          <motion.div
            aria-hidden
            className="absolute inset-y-0 -inset-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 0.9, delay: 1.9, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Hinge */}
      <div className="h-1.5 bg-gradient-to-b from-zinc-700 to-zinc-800 mx-2" />

      {/* Base */}
      <div className="relative -mx-[2.5%] h-4 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-b-[18px] shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[2px] bg-zinc-700/80 rounded-full" />
      </div>

      {/* Neon reflection puddle */}
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[70%] h-28 bg-[conic-gradient(from_0deg,rgba(255,45,149,0.25),rgba(255,107,0,0.18),rgba(0,245,255,0.22),rgba(131,56,236,0.25),rgba(255,45,149,0.25))] blur-3xl rounded-full"
      />
    </motion.div>
  )
}

function Hero() {
  return (
    <section className="mobile-card relative overflow-hidden bg-[#0a0a0a] lg:w-full">
      {/* Spotlight beams */}
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill="#ff2d95"
      />
      <Spotlight
        className="top-10 right-0 md:right-40 md:-top-10 scale-x-[-1]"
        fill="#00f5ff"
      />

      {/* Neon atmospheric glows — kept in the upper hero (behind the heading) so
          the laptop below sits on clean #0a0a0a instead of being washed by color */}
      <div className="absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(ellipse_at_top_right,_rgba(255,45,149,0.18),_transparent_50%)]" />
      <div className="absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(ellipse_at_top_left,_rgba(0,245,255,0.10),_transparent_55%)]" />
      <div className="absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(ellipse_at_50%_20%,_rgba(131,56,236,0.16),_transparent_60%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-8 md:px-12 pt-12 sm:pt-24 md:pt-36 pb-16 md:pb-24">
        {/* Text block — left aligned, editorial feel */}
        <div className="max-w-3xl">
          <AnimatedHeading
            as="h1"
            className="text-white font-medium leading-[1.05] tracking-[-0.02em] text-[44px] sm:text-5xl md:text-6xl lg:text-[84px]"
          >
            Valmenna <span className="neon-text">asiakkaita</span>,
            <br />
            älä taulukoita.
          </AnimatedHeading>

          <AnimatedText className="mt-6 sm:mt-8 text-white/75 max-w-xl leading-relaxed text-base sm:text-lg">
            Gainly on kaikki-yhdessä alusta fitness-valmentajille — rakenna
            treeniohjelmia, seuraa jokaisen asiakkaan edistymistä ja
            ennätyksiä, ja pidä yhteyttä asiakkaisiin yhdestä paikasta.
          </AnimatedText>

          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4 sm:gap-6">
            <NoiseBackground
              containerClassName="w-fit p-[2px] rounded-full"
              gradientColors={[
                'rgb(255, 45, 149)',
                'rgb(0, 245, 255)',
                'rgb(255, 214, 10)',
                'rgb(57, 255, 20)',
                'rgb(131, 56, 236)',
              ]}
              duration={5}
            >
              <button className="cursor-pointer rounded-full bg-linear-to-r from-black via-black to-neutral-900 pl-6 pr-2 py-2 flex items-center gap-3 font-medium text-sm text-white shadow-[0px_1px_0px_0px_var(--color-neutral-950)_inset,0px_1px_0px_0px_var(--color-neutral-800)] transition-all duration-150 active:scale-[0.98] hover:from-neutral-900 hover:to-black">
                Kokeile ilmaiseksi
                <span className="neon-bg w-9 h-9 rounded-full text-white flex items-center justify-center shadow-[0_0_20px_-2px_rgba(255,45,149,0.6)]">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </button>
            </NoiseBackground>
            <a
              href="#"
              className="text-white flex items-center gap-1 text-sm font-medium"
            >
              Varaa esittely <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Desktop laptop */}
        <div className="hidden sm:block mt-20 md:mt-24 mx-auto max-w-6xl">
          <LaptopMockup src={heroPhoto} alt="Gainly-valmentajan etusivu" />
        </div>

        {/* Mobile compact tilted screenshot card */}
        <motion.div
          className="sm:hidden mt-12 relative"
          style={{ perspective: '1400px' }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* glow halo */}
          <div
            aria-hidden
            className="absolute -inset-x-10 -top-6 -bottom-2 bg-[radial-gradient(ellipse_at_center,rgba(255,45,149,0.3),transparent_60%)] blur-2xl"
          />
          <motion.div
            className="relative rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]"
            style={{ transformStyle: 'preserve-3d' }}
            initial={{ rotateX: 18, rotateY: -8 }}
            animate={{ rotateX: 6, rotateY: -3 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src={heroPhoto}
              alt="Gainly-valmentajan etusivu"
              className="block w-full h-auto"
            />
            {/* gradient sheen */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none"
            />
          </motion.div>
          {/* neon underline reflection */}
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-2/3 h-16 bg-[conic-gradient(from_0deg,rgba(255,45,149,0.3),rgba(0,245,255,0.25),rgba(131,56,236,0.3),rgba(255,45,149,0.3))] blur-3xl rounded-full"
          />
        </motion.div>
      </div>

      {/* footer strip */}
      <div
        className="relative mx-auto w-full max-w-7xl px-4 sm:px-8 md:px-12 pb-6 sm:pb-8 pt-5 border-t border-white/10 flex items-center justify-between gap-4 tracking-[0.2em] text-white/60 uppercase"
        style={{ fontSize: '11px' }}
      >
        <span>Valmennusalusta</span>
        <span className="hidden sm:flex items-center gap-6">
          <span>
            <span className="text-white">01</span> / 04
          </span>
          <span>Seuraava</span>
        </span>
        <span>Selaa alas</span>
      </div>
    </section>
  )
}

/* ===================== WHY GAINLY ===================== */
function WhyGainlySection() {
  return (
    <section className="mobile-card py-20 md:py-32 px-4 sm:px-8 md:px-12 bg-surface">
      <div className="mx-auto max-w-7xl grid grid-cols-12 gap-8 md:gap-12">
        <div className="col-span-12 md:col-span-7">
          <div
            className="mb-6 sm:mb-8 tracking-[0.2em] uppercase text-muted-foreground"
            style={{ fontSize: '11.26px', fontFamily: HOVES }}
          >
            Miksi Gainly
          </div>
          <AnimatedHeading className="text-[34px] sm:text-4xl md:text-5xl lg:text-[58px] font-medium leading-[1.05]">
            <FlipWords
              words={['Rakennettu', 'Mietitty', 'Testattu', 'Hiottu']}
              className="neon-text"
            />{' '}
            treenaajien
            <br />
            toimesta — sinulle.
          </AnimatedHeading>
        </div>
        <div className="col-span-12 md:col-span-5 md:col-start-8 md:pt-6">
          <AnimatedText className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Gainlyn tekijät ovat itse urheilijoita ja valmentajia. Joka ikinen
            ominaisuus on testattu omassa treenissä ennen kuin se on päätynyt
            asiakkaillesi — siksi loggeri toimii ilman nettiä, ennätykset
            tunnistetaan oikein, ja viestit eivät eksy sähköpostiin. Ei generic
            SaaS-tuote, vaan työkalu jonka itse halusimme käyttöön.
          </AnimatedText>
        </div>
      </div>
    </section>
  )
}

/* ================= CLIENT FEATURES ================= */
const clientFeatures = [
  {
    icon: WifiOff,
    color: 'var(--neon-cyan)',
    image: '/mobile-offline.png',
    title: 'Offline-tuki',
    desc: 'Sarjat kirjautuvat myös ilman nettiä. Synkronoituu automaattisesti kun yhteys palaa — kuntosalin kuolleista pisteistä ei tarvitse huolehtia.',
    content:
      'Kaikki kirjaukset menevät paikalliseen Dexie-tietokantaan ja synkronoituvat taustalla heti kun verkkoyhteys palaa. Last-write-wins -strategia varmistaa että uudemmat tiedot eivät katoa konflikteissa. Asiakas keskittyy treeniin, sinä saat datan oikein — ei syyttäviä viestejä kadonneista sarjoista.',
  },
  {
    icon: Dumbbell,
    color: 'var(--neon-green)',
    image: '/mobile-logger.png',
    title: 'Nopea loggeri',
    desc: 'Painot, toistot ja RPE muutamalla napautuksella. Edellisen viikon arvot näkyvät vieressä, joten progressio on suoraan silmissä.',
    content:
      'Suuri kosketuskäyttöliittymä, jossa edellisen viikon arvot näkyvät vasemmalla ja kuluvan viikon kirjaus oikealla. RPE 6–10 skaala, automaattiset kuormaehdotukset edellisen sarjan pohjalta. Yksi sarja kirjautuu alle kolmessa sekunnissa.',
  },
  {
    icon: Trophy,
    color: 'var(--neon-yellow)',
    image: '/mobile-gains.png',
    title: 'Automaattiset ennätykset',
    desc: 'Heti kun asiakas rikkoo ennätyksen, hän saa toaster-ilmoituksen. Motivaatio nousee, treenipäiväkirja kerää PR-merkit talteen.',
    content:
      'Trigger-pohjainen PR-tunnistus per liike per toistomäärä — myös arvioidulla 1RM:llä. Realtime-kanava lähettää toaster-ilmoituksen heti, ja PR-merkki tallentuu treenipäiväkirjan aikajanalle. Asiakas näkee mustaa valkoisella: tämä viikko ylitti edellisen.',
  },
  {
    icon: MessageCircle,
    color: 'var(--neon-pink)',
    image: '/mobile-messages.png',
    title: 'Suora viestintä',
    desc: 'Kaikki keskustelut samassa appissa kuin treenit ja ohjelma. Ei WhatsAppia, ei sähköpostia — palaute löytyy aina sieltä missä se tehtiin.',
    content:
      'Yksi keskustelu per asiakas: lähetä ohjeita, palautetta, motivaatiosanat samassa appissa missä treenit ja ohjelma ovat. Lukukuittaukset näkyvät — tiedät että viesti meni perille. Asiakas vastaa kontekstissa, ei kolmen alustan välillä hyppien.',
  },
  {
    icon: Apple,
    color: 'var(--neon-orange)',
    image: '/mobile-meals.png',
    title: 'Ateriaohjelma taskussa',
    desc: 'Päivittäinen ruokavalio Fineli-ravintotiedoilla ja vaihdettavilla ateriaoptioilla. Treeni ja ravinto samassa paikassa.',
    content:
      'Fineli-tietokannan ravintotiedot kaikkien ainesosien takana — proteiinit, hiilihydraatit, rasvat ja mikroravinteet kerrottuna oikein. Vaihtoehtoja per ateria, joten asiakas voi valita mieleisensä makrojen pysyessä kohdillaan. Treenipäivän ja lepopäivän erikseen.',
  },
  {
    icon: Scale,
    color: 'var(--neon-blue)',
    image: '/mobile-painonhallinta.png',
    title: 'Painonhallinta',
    desc: 'Päivittäinen painokirjaus ja liukuva trendikäyrä. Asiakas näkee onko menossa tavoitteen suuntaan vai poukkoileeko viikon kohinassa.',
    content:
      'Asiakas kirjaa aamupainonsa minuutissa, ja appi laskee viikon liukuvan keskiarvon päiväkohtaisten heilahdusten alta. Tavoitepaino + ennustettu saavutuspäivä näkyvät — sekä asiakas että valmentaja näkevät heti onko ohjelma toimiva vai pitääkö makroja säätää. Kuvaaja päivittyy automaattisesti, ei manuaalista Exceleitä.',
  },
  {
    icon: Smartphone,
    color: 'var(--neon-violet)',
    image: '/mobile-home.jpg',
    title: 'Asennettavissa kotinäytölle',
    desc: 'Toimii kuin natiivi appi: ei App Storea, ei päivityksiä, ei tiedostokokoja. Avaa puhelimesta, kirjaa, jatka treeniä.',
    content:
      'PWA-asennus iOS Safarista ja Android Chromesta — kotinäyttöikoni, fullscreen-näkymä, push-ilmoitukset PR:istä ja viesteistä. Service worker pitää sisällön cachessa offline-käyttöä varten. Ei App Store -hyväksyntää, ei pakkopäivityksiä — uusi versio on aina valmiina kun appi avataan.',
  },
]

function MobileScreenshot({ src, color }: { src: string; color: string }) {
  return (
    <div className="relative">
      {/* neon halo behind phone */}
      <div
        aria-hidden
        className="absolute -inset-12 -z-10 blur-3xl opacity-60"
        style={{
          background: `radial-gradient(ellipse at center, ${color}33, transparent 65%)`,
        }}
      />
      <div className="relative w-[260px] sm:w-[300px] md:w-[320px] lg:w-[340px] aspect-[1284/2778] rounded-[44px] bg-zinc-900 ring-2 ring-zinc-700 overflow-hidden shadow-[0_40px_80px_-25px_rgba(0,0,0,0.8)]">
        {/* notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
        {/* screen — real screenshot, same aspect ratio as iPhone */}
        <div className="absolute inset-[6px] rounded-[36px] overflow-hidden bg-[#0a0a0a]">
          <img
            src={src}
            alt=""
            className="block w-full h-full object-cover object-top"
          />
        </div>
      </div>
    </div>
  )
}

function FeatureRow({
  f,
  index,
  active,
  isFirst,
  onActivate,
}: {
  f: (typeof clientFeatures)[number]
  index: number
  active: boolean
  isFirst: boolean
  onActivate: () => void
}) {
  const Icon = f.icon
  return (
    <li
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      role="button"
      tabIndex={0}
      className={cn(
        'group relative cursor-pointer outline-none py-4 sm:py-5 transition-colors duration-500',
        !isFirst && 'border-t border-white/[0.08]',
        active && 'border-t-white/25',
      )}
    >
      {/* Neon glow marker — top edge, grows when active */}
      <span
        aria-hidden
        className={cn(
          'absolute -top-px left-0 h-[2px] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
          active ? 'w-[64px] opacity-100' : 'w-[12px] opacity-40',
        )}
        style={{
          background: f.color,
          boxShadow: active ? `0 0 18px ${f.color}, 0 0 6px ${f.color}` : 'none',
        }}
      />

      <div className="flex items-center gap-5 sm:gap-8 md:gap-10">
        {/* Big editorial index */}
        <span
          className={cn(
            'text-3xl sm:text-4xl md:text-5xl leading-none tabular-nums transition-colors duration-500 shrink-0 tracking-tight',
            active ? 'text-white/90' : 'text-white/20',
          )}
          style={{ fontFamily: 'var(--font-display)', fontWeight: 900 }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Title + reveal content */}
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'text-xl sm:text-2xl md:text-3xl leading-tight tracking-tight transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
              active
                ? 'text-white translate-x-1'
                : 'text-white/40 group-hover:text-white/70 group-hover:translate-x-0.5',
            )}
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
          >
            {f.title}
          </h3>

          <AnimatePresence initial={false}>
            {active && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
                  {f.desc}
                </p>

                {/* Mobile inline phone */}
                <div className="lg:hidden mt-6 flex justify-center">
                  <MobileScreenshot src={f.image} color={f.color} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Icon — far right, glows when active */}
        <div
          className={cn(
            'shrink-0 transition-all duration-500',
            active ? 'scale-110' : 'scale-90 opacity-40 group-hover:opacity-70',
          )}
        >
          <Icon
            className="w-7 h-7 sm:w-8 sm:h-8"
            style={{
              color: active ? f.color : 'rgb(255 255 255 / 0.6)',
              filter: active
                ? `drop-shadow(0 0 14px ${f.color})`
                : 'none',
            }}
          />
        </div>
      </div>
    </li>
  )
}

function PhoneStage({
  current,
}: {
  current: (typeof clientFeatures)[number]
}) {
  return (
    <div
      className="relative grid place-items-center"
      style={{ perspective: '1600px' }}
    >
      {/* Halo */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -m-24 blur-3xl pointer-events-none -z-10"
        animate={{
          background: `radial-gradient(ellipse at center, ${current.color}40, transparent 65%)`,
        }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ rotateY: -14, rotateX: 4 }}
        whileHover={{ rotateY: -4, rotateX: 0, scale: 1.02 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.image}
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -30, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <MobileScreenshot src={current.image} color={current.color} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Active feature caption — links phone visually to active row */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 text-center"
        >
          <div
            className="text-[10px] tracking-[0.3em] uppercase text-white/40"
            style={{ fontFamily: HOVES }}
          >
            Asiakkaalle näkyy
          </div>
          <div
            className="mt-2 text-base"
            style={{
              color: current.color,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
            }}
          >
            {current.title}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ClientFeaturesShowcase() {
  const [active, setActive] = useState(0)
  const current = clientFeatures[active] ?? clientFeatures[0]!

  return (
    <div className="grid lg:grid-cols-[1fr_0.85fr] gap-12 lg:gap-20 items-start">
      {/* LEFT: editorial feature ribbon */}
      <ol className="flex flex-col">
        {clientFeatures.map((f, i) => (
          <FeatureRow
            key={f.title}
            f={f}
            index={i}
            isFirst={i === 0}
            active={active === i}
            onActivate={() => setActive(i)}
          />
        ))}
      </ol>

      {/* RIGHT: sticky phone stage — desktop only */}
      <aside className="hidden lg:block">
        <div className="sticky top-32">
          <PhoneStage current={current} />
        </div>
      </aside>
    </div>
  )
}

function ClientFeaturesSection() {
  return (
    <section className="mobile-card py-20 md:py-32 px-4 sm:px-8 md:px-12 bg-[#101010] lg:bg-transparent">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 md:mb-24 grid grid-cols-12 gap-8 md:gap-12">
          <div className="col-span-12 md:col-span-7">
            <div
              className="mb-6 sm:mb-8 tracking-[0.2em] uppercase text-muted-foreground"
              style={{ fontSize: '11.26px', fontFamily: HOVES }}
            >
              Asiakaspuoli
            </div>
            <AnimatedHeading className="text-[34px] sm:text-4xl md:text-5xl lg:text-[58px] font-medium leading-[1.05]">
              Miksi asiakkaasi
              <br />
              rakastavat Gainlya
            </AnimatedHeading>
          </div>
          <div className="col-span-12 md:col-span-4 md:col-start-9 md:pt-4">
            <AnimatedText className="text-base text-muted-foreground leading-relaxed">
              Hyvä valmennustyökalu on yhtä paljon asiakkaan etu kuin sinun.
              Asiakaspuoli on tehty siitä mitä salilla oikeasti tarvitaan —
              nopeasti, ilman estoja.
            </AnimatedText>
          </div>
        </div>

        <ClientFeaturesShowcase />
      </div>
    </section>
  )
}

/* =================== BENEFITS SECTION =================== */
const benefits = [
  {
    title: 'Ohjelmointi',
    desc: 'Rakenna treeniohjelma kerran, ja sovita se jokaiselle asiakkaalle. Viikot, päivät ja liikkeet rakenteessa, joka skaalautuu asiakaskuntasi mukana.',
    img: benefitProgramming,
  },
  {
    title: 'Edistyminen',
    desc: 'Automaattinen ennätysten tunnistus ja arvioitu 1RM-käyrä tekevät jokaisesta kirjatusta sarjasta näkyvää edistystä — sitä mikä pitää asiakkaat motivoituneina ja tilauksen voimassa.',
    img: benefitProgress,
  },
  {
    title: 'Viestintä',
    desc: 'Pidä yhteyttä asiakkaisiin samassa paikassa missä ohjelmat ja kirjaukset jo ovat. Ei enää WhatsAppin selaamista vanhan kommentin perään.',
    img: benefitMessaging,
  },
]

function BenefitLaptop({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full">
      {/* neon glow */}
      <div
        aria-hidden
        className="absolute -inset-x-20 -top-10 bottom-0 bg-[radial-gradient(ellipse_at_center,rgba(255,45,149,0.22),transparent_65%)] blur-2xl -z-10"
      />
      <div
        aria-hidden
        className="absolute -inset-x-24 top-1/2 -bottom-8 bg-[radial-gradient(ellipse_at_center,rgba(0,245,255,0.12),transparent_70%)] blur-3xl -z-10"
      />
      {/* Lid */}
      <div className="relative rounded-[18px] bg-zinc-800 p-[0.6%] pt-[0.9%] shadow-[0_50px_100px_-25px_rgba(0,0,0,0.75)] ring-1 ring-white/10">
        <div className="absolute top-[0.4%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-600" />
        <div className="relative rounded-[10px] overflow-hidden bg-zinc-950 aspect-[16/9]">
          <AnimatePresence mode="wait">
            <motion.img
              key={src}
              src={src}
              alt={alt}
              initial={{ opacity: 0, scale: 1.015 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          </AnimatePresence>
        </div>
      </div>
      <div className="h-1.5 bg-gradient-to-b from-zinc-700 to-zinc-800 mx-2" />
      <div className="relative -mx-[2.5%] h-4 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-b-[18px] shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[2px] bg-zinc-700/80 rounded-full" />
      </div>
    </div>
  )
}

function BenefitsSection() {
  const [active, setActive] = useState(0)
  const refs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActive(i)
        },
        { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
      )
      io.observe(el)
      return io
    })
    return () => observers.forEach((o) => o?.disconnect())
  }, [])

  const current = benefits[active] ?? benefits[0]!

  return (
    <section className="mobile-card relative bg-surface">
      {/* header */}
      <div className="mx-auto max-w-7xl px-4 sm:px-8 md:px-12 pt-20 md:pt-32 pb-12 md:pb-16 grid grid-cols-12 gap-8 md:gap-12">
        <div className="col-span-12 md:col-span-7">
          <div
            className="mb-6 sm:mb-8 tracking-[0.2em] uppercase text-muted-foreground"
            style={{ fontSize: '11.26px', fontFamily: HOVES }}
          >
            Valmentajan työkalut
          </div>
          <AnimatedHeading className="text-[34px] sm:text-4xl md:text-5xl lg:text-[58px] font-medium leading-[1.05]">
            Miksi valmentajat
            <br />
            <Highlight>valitsevat Gainlyn</Highlight>
          </AnimatedHeading>
        </div>
        <div className="col-span-12 md:col-span-4 md:col-start-9 md:pt-6">
          <AnimatedText className="text-base text-muted-foreground leading-relaxed">
            Ohjelmointi, edistymisen seuranta ja viestintä samassa alustassa —
            scrollaa läpi näkymät ja näe mistä Gainly oikeasti koostuu.
          </AnimatedText>
        </div>
      </div>

      {/* MOBILE: tab-based showcase */}
      <div className="lg:hidden mx-auto max-w-7xl px-4 sm:px-8 pb-20">
        {/* Tab bar */}
        <div className="flex gap-2 p-1 rounded-full border border-white/10 bg-background/50 backdrop-blur mb-8 sm:mb-10">
          {benefits.map((b, i) => (
            <button
              key={b.title}
              onClick={() => setActive(i)}
              className="flex-1 relative px-3 py-2.5 text-sm font-medium rounded-full transition-colors"
            >
              {active === i && (
                <motion.span
                  layoutId="benefit-tab-active"
                  className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15"
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <span
                className={`relative ${active === i ? 'text-white' : 'text-muted-foreground'}`}
              >
                {b.title}
              </span>
            </button>
          ))}
        </div>

        {/* Screenshot card (no laptop chrome, more compact) */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-x-6 -top-4 -bottom-4 bg-[radial-gradient(ellipse_at_center,rgba(255,45,149,0.18),transparent_65%)] blur-2xl"
          />
          <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.7)] aspect-[16/9] bg-zinc-950">
            <AnimatePresence mode="wait">
              <motion.img
                key={current.img}
                src={current.img}
                alt={current.title}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
            </AnimatePresence>
          </div>
        </div>

        {/* Active content below */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <div className="flex items-start gap-3 mb-3">
              <span
                className="text-xs text-muted-foreground mt-2 tracking-[0.2em]"
                style={{ fontFamily: HOVES }}
              >
                ({`0${active + 1}`})
              </span>
              <h3 className="text-2xl sm:text-3xl font-medium leading-tight">
                {current.title}
              </h3>
            </div>
            <TextGenerateEffect
              key={current.title}
              words={current.desc}
              className="text-base text-muted-foreground leading-relaxed"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* DESKTOP: scroll-driven showcase */}
      <div className="hidden lg:block mx-auto max-w-[1440px] px-6 lg:px-10 pb-32">
        <div className="grid lg:grid-cols-[2.2fr_1fr] gap-10 xl:gap-14">
          <div>
            <div className="sticky top-32">
              <BenefitLaptop src={current.img} alt={current.title} />
              <div className="mt-10 flex items-center gap-3">
                {benefits.map((b, i) => (
                  <div
                    key={b.title}
                    className="relative h-px flex-1 bg-white/10 overflow-hidden"
                  >
                    <motion.div
                      className="neon-bg absolute inset-y-0 left-0"
                      initial={false}
                      animate={{
                        width:
                          active === i ? '100%' : active > i ? '100%' : '0%',
                      }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                ))}
              </div>
              <div
                className="mt-4 tracking-[0.2em] uppercase text-muted-foreground"
                style={{ fontSize: '11px' }}
              >
                {`0${active + 1}`} / {`0${benefits.length}`} — {current.title}
              </div>
            </div>
          </div>

          <div>
            {benefits.map((b, i) => (
              <div
                key={b.title}
                ref={(el) => {
                  refs.current[i] = el
                }}
                className="min-h-[85vh] flex items-center py-12"
              >
                <motion.div
                  initial={false}
                  animate={{ opacity: active === i ? 1 : 0.35 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span
                      className="text-xs text-muted-foreground mt-3 tracking-[0.2em]"
                      style={{ fontFamily: HOVES }}
                    >
                      ({`0${i + 1}`})
                    </span>
                    <h3 className="text-4xl md:text-5xl font-medium leading-tight">
                      {b.title}
                    </h3>
                  </div>
                  <TextGenerateEffect
                    words={b.desc}
                    className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-md"
                  />
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ================== TESTIMONIALS ================== */
const testimonials = [
  {
    quote:
      'Gainly leikkasi viikon admin-työn puoleen. Asiakkaat saavat ohjelman suoraan puhelimeen ja loggaavat itse — keskityn nyt valmennukseen, en taulukoihin.',
    name: 'Eero Nieminen',
    title: 'Voimaharjoitteluvalmentaja',
  },
  {
    quote:
      'Aiemmin selasin WhatsAppia ja Exceleitä. Nyt asiakkaat näkevät ennätyksensä reaaliajassa ja sitoutuminen on noussut konkreettisesti.',
    name: 'Maija Saari',
    title: 'Online PT',
  },
  {
    quote:
      'Ohjelma, ennätykset, ruokaohjelma ja viestit yhdessä paikassa — pelin avaaja. Asiakkaat eivät putoa kärryiltä enää viikon välissä.',
    name: 'Tomi Karhu',
    title: 'Hybridivalmentaja',
  },
  {
    quote:
      'Offline-tuki on iso juttu. Salin kuolleilta pisteiltä kadonneet kirjaukset olivat ennen normaali ongelma. Nyt kaikki menee perille.',
    name: 'Helena Rinne',
    title: 'Strength Coach',
  },
  {
    quote:
      'Otimme Gainlyn kahdelle valmentajalle. Yhteinen liikepankki ja monistettavat ohjelmat — efektiivisyys nousi heti viikossa.',
    name: 'Jaakko Lehto',
    title: 'Voimanostotiimi',
  },
  {
    quote:
      'Asiakas-appi on niin selkeä, että 65-vuotiaskin asiakas kirjaa setit ilman tukea. Sehän kertoo paljon.',
    name: 'Aino Virtanen',
    title: 'Yleisvalmentaja',
  },
]

function TestimonialsSection() {
  return (
    <section className="mobile-card relative bg-surface overflow-hidden">
      {/* Boxes start from heading row, not from section top */}
      <div className="absolute inset-x-0 top-20 md:top-32 bottom-0 overflow-hidden">
        <Boxes />
        <div
          aria-hidden
          className="absolute inset-0 z-10 bg-surface pointer-events-none [mask-image:radial-gradient(transparent,white)]"
        />
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-8 md:px-12 py-20 md:py-32 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <div className="mb-12 md:mb-20 grid grid-cols-12 gap-8 md:gap-12">
          <div className="col-span-12 md:col-span-7">
            <div
              className="mb-6 sm:mb-8 tracking-[0.2em] uppercase text-muted-foreground"
              style={{ fontSize: '11.26px', fontFamily: HOVES }}
            >
              Kokemuksia
            </div>
            <AnimatedHeading className="text-[34px] sm:text-4xl md:text-5xl lg:text-[58px] font-medium leading-[1.05]">
              Mitä{' '}
              <FlipWords
                words={['valmentajat', 'käyttäjät', 'treenaajat', 'urheilijat']}
                className="neon-text"
              />
              <br />
              sanovat Gainlystä
            </AnimatedHeading>
          </div>
          <div className="col-span-12 md:col-span-4 md:col-start-9 md:pt-4">
            <AnimatedText className="text-base text-muted-foreground leading-relaxed">
              Suoraa puhetta valmentajilta, jotka rakentavat ohjelmansa,
              seuraavat asiakkaitaan ja kasvattavat liiketoimintaansa Gainlyn
              päällä.
            </AnimatedText>
          </div>
        </div>

        <InfiniteMovingCards
          items={testimonials}
          direction="right"
          speed="slow"
        />
      </div>
    </section>
  )
}

/* ===================== PRICING ===================== */
type Tier = {
  id: 'aloitus' | 'kasvu' | 'rajaton'
  name: string
  tagline: string
  price: string
  priceSuffix: string
  features: string[]
  cta: string
  color: string
  recommended?: boolean
}

const tiers: Array<Tier> = [
  {
    id: 'aloitus',
    name: 'Aloitus',
    tagline: 'Ensimmäiset asiakkaat, alle minuutissa pystyssä.',
    price: '39',
    priceSuffix: '€ / kk',
    features: [
      'Enintään 10 aktiivista asiakasta',
      'Kaikki tuotteen ominaisuudet',
      'Suomenkielinen tuki',
    ],
    cta: 'Aloita Aloitus-tasolla',
    color: 'var(--neon-green)',
  },
  {
    id: 'kasvu',
    name: 'Kasvu',
    tagline: 'Vakiintuneelle PT:lle, joka kasvattaa rosteria.',
    price: '59',
    priceSuffix: '€ / kk',
    features: [
      'Enintään 50 aktiivista asiakasta',
      'Kaikki tuotteen ominaisuudet',
      'Priorisoitu suomenkielinen tuki',
      'Yksi valmentajatili',
    ],
    cta: 'Aloita Kasvu-tasolla',
    color: 'var(--neon-magenta)',
    recommended: true,
  },
  {
    id: 'rajaton',
    name: 'Rajaton',
    tagline: 'Studioille ja monen valmentajan tiimeille.',
    price: '99',
    priceSuffix: '€ / kk',
    features: [
      'Rajaton asiakasmäärä',
      'Useita valmentajatilejä',
      'Kaikki tuotteen ominaisuudet',
      'Priorisoitu suomenkielinen tuki',
    ],
    cta: 'Aloita Rajaton-tasolla',
    color: 'var(--neon-violet)',
  },
]

function PricingTier({ tier, index }: { tier: Tier; index: number }) {
  const isRecommended = !!tier.recommended
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration: 0.7,
        delay: index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        'group relative flex flex-col',
        isRecommended && 'lg:-translate-y-3',
      )}
    >
      {/* Per-tier halo — sits behind the tier block, intensifies on hover */}
      <div
        aria-hidden
        className={cn(
          'absolute -inset-x-6 -inset-y-10 lg:-inset-x-4 lg:-inset-y-12 -z-10 blur-3xl pointer-events-none transition-opacity duration-500',
          isRecommended
            ? 'opacity-60 group-hover:opacity-90'
            : 'opacity-25 group-hover:opacity-55',
        )}
        style={{
          background: `radial-gradient(ellipse at center, ${tier.color}40, transparent 65%)`,
        }}
      />

      {/* Suositeltu pin — only on the middle tier. Black on pink for AA contrast. */}
      {isRecommended && (
        <div
          className="absolute -top-3 left-0 lg:left-1/2 lg:-translate-x-1/2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)] text-black shadow-[0_6px_22px_rgba(255,45,149,0.55)]"
          style={{
            fontFamily: HOVES,
            fontSize: '10.5px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          Suositeltu
        </div>
      )}

      {/* Tier name + neon dot */}
      <div className="flex items-center gap-3 mb-4">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
          style={{
            background: tier.color,
            boxShadow: `0 0 12px ${tier.color}, 0 0 4px ${tier.color}`,
          }}
        />
        <h3
          className="text-xl sm:text-2xl text-white tracking-[-0.02em]"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          {tier.name}
        </h3>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2.5 mb-5">
        <span
          className="leading-none tracking-[-0.04em] tabular-nums text-white"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: isRecommended
              ? 'clamp(64px, 9vw, 96px)'
              : 'clamp(48px, 7vw, 76px)',
          }}
        >
          {tier.price}
        </span>
        <span className="text-sm sm:text-base text-muted-foreground font-medium">
          {tier.priceSuffix}
        </span>
      </div>

      {/* Tagline */}
      <p
        className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-7 sm:mb-8 max-w-[30ch]"
        style={{ textWrap: 'pretty' }}
      >
        {tier.tagline}
      </p>

      {/* Feature list */}
      <ul className="flex flex-col gap-3 mb-8 sm:mb-10 flex-1">
        {tier.features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-3 text-[15px] sm:text-base text-white/90 leading-relaxed"
          >
            <span
              aria-hidden
              className="mt-0.5 grid place-items-center w-5 h-5 rounded-full shrink-0"
              style={{
                background: `${tier.color}1f`,
                boxShadow: `inset 0 0 0 1px ${tier.color}55`,
              }}
            >
              <Check
                className="w-3 h-3"
                strokeWidth={3}
                style={{ color: tier.color }}
              />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA — Kasvu is a filled co-brand-pink pill (the primary action),
          Aloitus + Rajaton are hairline pills with per-tier neon arrow circles */}
      <a
        href="#contact"
        data-tier={tier.id}
        className={cn(
          'group/cta relative inline-flex items-center justify-between gap-3 rounded-full pl-5 pr-2 py-2 text-sm transition-all duration-200 active:scale-[0.98]',
          isRecommended
            ? 'text-black font-semibold shadow-[0_8px_28px_-6px_rgba(255,45,149,0.55)]'
            : 'text-white font-medium bg-white/[0.04] border border-white/10 hover:bg-white/[0.08]',
        )}
        style={
          isRecommended
            ? {
                background: 'var(--accent)',
              }
            : undefined
        }
      >
        <span>{tier.cta}</span>
        <span
          aria-hidden
          className="grid place-items-center w-9 h-9 rounded-full transition-transform duration-200 group-hover/cta:translate-x-0.5 shrink-0"
          style={
            isRecommended
              ? {
                  background: '#000',
                  color: '#fff',
                }
              : {
                  background: tier.color,
                  color: '#000',
                  boxShadow: `0 0 18px -3px ${tier.color}`,
                }
          }
        >
          <ArrowUpRight className="w-4 h-4" />
        </span>
      </a>
    </motion.div>
  )
}

function PricingSection() {
  return (
    <section
      id="pricing"
      className="mobile-card relative overflow-hidden bg-background"
    >
      {/* Soft co-brand bloom behind the section to seat it on the page */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(255,45,149,0.08),transparent_55%)] pointer-events-none"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-8 md:px-12 py-20 md:py-32">
        {/* Section header — same editorial cadence (kicker → headline → para) */}
        <div className="mb-16 md:mb-24 grid grid-cols-12 gap-8 md:gap-12">
          <div className="col-span-12 md:col-span-7">
            <div
              className="mb-6 sm:mb-8 tracking-[0.2em] uppercase text-muted-foreground"
              style={{ fontSize: '11.26px', fontFamily: HOVES }}
            >
              Hinnoittelu
            </div>
            <AnimatedHeading className="text-[34px] sm:text-4xl md:text-5xl lg:text-[58px] font-medium leading-[1.05]">
              Yksi Gainly,
              <br />
              <span className="neon-text">kolme kokoa</span>.
            </AnimatedHeading>
          </div>
          <div className="col-span-12 md:col-span-4 md:col-start-9 md:pt-6">
            <AnimatedText className="text-base text-muted-foreground leading-relaxed">
              Sama tuote, samat ominaisuudet, joka tasolla. Hinta seuraa
              asiakasmäärääsi — ei piilomaksuja, ei per-asiakas-laskuja.
            </AnimatedText>
          </div>
        </div>

        {/* Three-tier composition. lg+: asymmetric tracks emphasize the middle */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.18fr_1fr] gap-y-24 lg:gap-x-12 xl:gap-x-16 items-stretch">
          {tiers.map((tier, i) => (
            <PricingTier key={tier.id} tier={tier} index={i} />
          ))}
        </div>

        {/* Trust strip — quiet, separator-dotted */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 md:mt-28 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground"
          style={{ fontFamily: HOVES }}
        >
          {[
            'Suomenkielinen tiimi',
            'ALV 0 € PDF-lasku',
            'Ei aloitusmaksua',
            'Vapaasti irtisanottavissa',
          ].map((item, i, arr) => (
            <span key={item} className="inline-flex items-center gap-x-5">
              <span>{item}</span>
              {i < arr.length - 1 && (
                <span aria-hidden className="text-white/25">
                  ·
                </span>
              )}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ===================== CLOSING CTA ===================== */
function ClosingCTASection() {
  return (
    <section
      id="contact"
      className="mobile-card relative overflow-hidden bg-surface"
    >
      {/* All colored decoration fades in at the top and out at the bottom, so
          the section bleeds out of the dark section above and into the footer
          below instead of cutting hard glow edges at either seam. */}
      <div
        aria-hidden
        className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_35%,black_70%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_35%,black_70%,transparent)]"
      >
        {/* Spotlight beams continuing the hero's stage motif */}
        <Spotlight
          className="-top-32 left-0 md:-top-16 md:left-40"
          fill="#ff2d95"
        />
        <Spotlight
          className="top-20 right-0 md:right-32 md:top-0 scale-x-[-1]"
          fill="#00f5ff"
        />

        {/* Atmospheric glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,45,149,0.15),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(131,56,236,0.12),transparent_60%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-8 md:px-12 py-24 md:py-40 text-center">
        <AnimatedHeading
          as="h2"
          className="text-white font-medium leading-[1.05] tracking-[-0.02em] text-[40px] sm:text-5xl md:text-6xl lg:text-[80px]"
        >
          Valmis tekemään
          <br />
          <span className="neon-text">parempaa valmennusta?</span>
        </AnimatedHeading>

        <AnimatedText className="mt-7 sm:mt-9 text-white/75 max-w-xl mx-auto leading-relaxed text-base sm:text-lg">
          Jätä yhteystietosi, niin perustamme tilin ja käymme käyttöönoton yhdessä
          läpi. Suomeksi, kahvikupin verran aikaa.
        </AnimatedText>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
        >
          <NoiseBackground
            containerClassName="w-fit p-[2px] rounded-full"
            gradientColors={[
              'rgb(255, 45, 149)',
              'rgb(0, 245, 255)',
              'rgb(255, 214, 10)',
              'rgb(57, 255, 20)',
              'rgb(131, 56, 236)',
            ]}
            duration={5}
          >
            <a
              href="#contact"
              className="cursor-pointer rounded-full bg-linear-to-r from-black via-black to-neutral-900 pl-6 pr-2 py-2 flex items-center gap-3 font-medium text-sm text-white shadow-[0px_1px_0px_0px_var(--color-neutral-950)_inset,0px_1px_0px_0px_var(--color-neutral-800)] transition-all duration-150 active:scale-[0.98] hover:from-neutral-900 hover:to-black"
            >
              Aloita maksuton kokeilu
              <span className="neon-bg w-9 h-9 rounded-full text-white flex items-center justify-center shadow-[0_0_20px_-2px_rgba(255,45,149,0.6)]">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </a>
          </NoiseBackground>
          <a
            href="#contact"
            className="text-white flex items-center gap-1 text-sm font-medium"
          >
            Varaa esittely <ArrowUpRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
