import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { lazy, Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { detectQuality, hasWebGL } from '../quality'
import { ANALYTES, hero } from './heroState'

gsap.registerPlugin(ScrollTrigger)
const SampleField = lazy(() => import('./SampleField'))

const STEPS = [
  { n: '01', t: 'Sample', d: 'Four compounds, mixed together and indistinguishable.' },
  { n: '02', t: 'Separation', d: 'Each partitions differently into the stationary phase, so each travels at its own speed.' },
  { n: '03', t: 'Signal', d: 'A detector turns each band into a peak. The chemistry of that conversion is what this page is about.' },
]

/** Static stand-in for the 3D field when WebGL isn't available. */
function StaticChromatogram() {
  const path = (rt: number, h: number, w: number) => {
    let d = ''
    for (let i = 0; i <= 80; i++) {
      const x = rt - 4 * w + (i / 80) * 8 * w
      const y = h * Math.exp(-(((x - rt) / w) ** 2) / 2)
      d += `${i ? 'L' : 'M'}${(x + 4.6) * 100},${300 - y * 100}`
    }
    return d
  }
  return (
    <svg className="hero-static" viewBox="0 0 920 320" aria-hidden="true">
      <line x1="0" y1="300" x2="920" y2="300" stroke="#9aa6bc" strokeOpacity=".4" />
      {ANALYTES.map((a) => (
        <path key={a.color} d={path(a.rt, a.h, a.w)} fill={a.color} fillOpacity=".12" stroke={a.color} strokeWidth="2" />
      ))}
    </svg>
  )
}

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const webgl = useMemo(hasWebGL, [])
  const q = useMemo(detectQuality, [])

  useLayoutEffect(() => {
    const onPointer = (e: PointerEvent) => {
      hero.pointerX = e.clientX / innerWidth - 0.5
      hero.pointerY = e.clientY / innerHeight - 0.5
    }
    addEventListener('pointermove', onPointer, { passive: true })

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (s) => (hero.p = s.progress),
      })

      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: true } })
      tl.to('.hero-copy', { autoAlpha: 0, y: -40, ease: 'none', duration: 0.1 }, 0.02)
      // [fade in, fade out] for each caption, matched to the particle phases in SampleField
      const windows: [number, number | null][] = [
        [0.1, 0.26],
        [0.32, 0.58],
        [0.64, null],
      ]
      windows.forEach(([inAt, outAt], i) => {
        tl.fromTo(`.step-${i}`, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: 'none' }, inAt)
        if (outAt !== null) tl.to(`.step-${i}`, { autoAlpha: 0, y: -16, duration: 0.06, ease: 'none' }, outAt)
      })
      tl.set({}, {}, 1)
      tl.fromTo('.rt-labels', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1, ease: 'none' }, 0.82)
      tl.to('.scroll-cue', { autoAlpha: 0, duration: 0.05 }, 0.02)

      gsap.from('.hero-copy > *', { y: 24, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.1 })
    }, root)

    return () => {
      removeEventListener('pointermove', onPointer)
      ctx.revert()
    }
  }, [])

  return (
    <section ref={root} className="hero" id="top">
      <div className="hero-sticky">
        <div className="hero-stage">
          {webgl ? (
            <Suspense fallback={null}>
              <SampleField count={q.level === 'high' ? 9000 : 3600} dpr={q.dpr} target={root} />
            </Suspense>
          ) : (
            <StaticChromatogram />
          )}
        </div>

        <div className="wrap hero-inner">
          <div className="hero-copy">
            <div className="eyebrow">
              <i />
              Separation · Detection · Signal
            </div>
            <h1>
              What the detector <span className="grad">actually sees.</span>
            </h1>
            <p className="hero-lead">
              Every HPLC detector turns one piece of chemistry — light absorbed, light emitted, light bent, light scattered, or a molecule turned into an
              ion — into the peak on your screen.
            </p>
            <div className="hero-cta">
              <a className="btn primary" href="#detectors">
                Explore the detectors <span aria-hidden="true">→</span>
              </a>
              <a className="btn" href="#compare">
                Compare them
              </a>
            </div>
          </div>

          <div className="steps-overlay" aria-live="polite">
            {STEPS.map((s, i) => (
              <div key={s.n} className={`step step-${i}`}>
                <div className="mono-label">
                  <span className="accent">{s.n}</span> / 03
                </div>
                <h2>{s.t}</h2>
                <p>{s.d}</p>
              </div>
            ))}
          </div>

          <div className="rt-labels mono-label" aria-hidden="true">
            Retention time →
          </div>
        </div>

        <div className="scroll-cue mono-label">
          Scroll to run the sample
          <span />
        </div>
      </div>
    </section>
  )
}
