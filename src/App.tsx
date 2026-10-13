import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect } from 'react'
import { Compare } from './components/Compare'
import { DetectorExplorer } from './detectors/DetectorExplorer'
import { Hero } from './hero/Hero'
import { startSmoothScroll } from './smoothScroll'

gsap.registerPlugin(ScrollTrigger)

function SectionHead({ n, kicker, title, children }: { n: string; kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="sec-head">
      <div className="sec-kicker reveal">
        <span className="accent">{n}</span>
        <span className="rule" />
        {kicker}
      </div>
      <h2 className="reveal">{title}</h2>
      {children && <p className="sec-lead reveal">{children}</p>}
    </div>
  )
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect x="0.5" y="0.5" width="25" height="25" rx="6" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <path d="M4 19 H7 Q8.5 19 9.2 13 Q9.8 8 10.6 13 Q11.3 19 13 19 Q14.6 19 15.2 15.5 Q15.8 12 16.4 15.5 Q17 19 18.6 19 H22" fill="none" stroke="#8f7dff" strokeWidth="1.5" />
    </svg>
  )
}

export default function App() {
  useLayoutEffect(() => startSmoothScroll(), [])

  useLayoutEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.reveal').forEach((el) => {
        gsap.from(el, { y: 28, autoAlpha: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } })
      })
      gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } })
    })
    const refresh = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refresh)
    addEventListener('load', refresh)
    return () => {
      removeEventListener('load', refresh)
      ctx.revert()
    }
  }, [])

  return (
    <>
      <div className="progress" aria-hidden="true" />
      <header className="site-head">
        <a href="#top" className="brand">
          <Logo />
          <span>HPLC Detectors</span>
        </a>
        <nav>
          <a href="#detectors">Detectors</a>
          <a href="#compare">Compare</a>
        </nav>
      </header>

      <main>
        <Hero />

        <section id="detectors" className="section">
          <div className="wrap">
            <SectionHead n="01" kicker="Detection chemistry" title="Five ways to turn a molecule into a peak.">
              No single detector sees everything. Each one converts a different physical property — light absorbed, light emitted, refractive index,
              scattering or mass — into a signal you can measure. Pick one to watch it work.
            </SectionHead>
            <div className="reveal">
              <DetectorExplorer />
            </div>
          </div>
        </section>

        <section id="compare" className="section">
          <div className="wrap">
            <SectionHead n="02" kicker="Side by side" title="Which detector fits your analyte?" />
            <Compare />
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <div className="wrap">
          <span className="mono-label">Inside the HPLC detector</span>
          <span className="mono-label">Schematics are simplified and not to scale</span>
        </div>
      </footer>
    </>
  )
}
