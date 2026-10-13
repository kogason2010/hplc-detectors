import { gsap } from 'gsap'
import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { DETECTORS } from './detectors'
import { DiagramCanvas } from './DiagramCanvas'

/** Tabs across the top, the live schematic, then the explanation. */
export function DetectorExplorer() {
  const [active, setActive] = useState(0)
  const [variantBy, setVariantBy] = useState<Record<string, number>>({})
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const panel = useRef<HTMLDivElement>(null)

  const base = DETECTORS[active]
  const vIdx = variantBy[base.id] ?? 0
  const variant = base.variants?.[vIdx]
  const d = { ...base, ...(variant ?? {}) }
  const viewKey = `${base.id}-${variant?.id ?? 'main'}`

  useLayoutEffect(() => {
    if (!panel.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.from('.diagram', { autoAlpha: 0, duration: 0.5, ease: 'power2.out' })
      gsap.from('.det-summary > *', { y: 12, autoAlpha: 0, duration: 0.5, ease: 'power3.out', stagger: 0.04 })
    }, panel)
    return () => ctx.revert()
  }, [viewKey])

  const select = (i: number, viaKeyboard = false) => {
    setActive(i)
    const el = tabs.current[i]
    if (viaKeyboard) el?.focus()
    // keep the chosen tab visible in the horizontally scrolling tab row on phones
    const row = el?.parentElement
    if (el && row && row.scrollWidth > row.clientWidth) row.scrollTo({ left: el.offsetLeft - row.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' })
  }
  const onKey = (e: KeyboardEvent) => {
    const n = DETECTORS.length
    if (e.key === 'ArrowRight') select((active + 1) % n, true)
    else if (e.key === 'ArrowLeft') select((active - 1 + n) % n, true)
    else if (e.key === 'Home') select(0, true)
    else if (e.key === 'End') select(n - 1, true)
    else return
    e.preventDefault()
  }

  return (
    <div className="explorer" style={{ '--det': d.color } as CSSProperties}>
      <div className="tabs" role="tablist" aria-label="Detectors" onKeyDown={onKey}>
        {DETECTORS.map((x, i) => (
          <button
            key={x.id}
            ref={(el) => void (tabs.current[i] = el)}
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={i === active}
            aria-controls={`panel-${x.id}`}
            tabIndex={i === active ? 0 : -1}
            className={i === active ? 'tab on' : 'tab'}
            style={{ '--tc': x.color } as CSSProperties}
            onClick={() => select(i)}
          >
            <span className="tab-n">{String(i + 1).padStart(2, '0')}</span>
            {x.tab}
          </button>
        ))}
      </div>

      <div ref={panel} className="det-panel" role="tabpanel" id={`panel-${base.id}`} aria-labelledby={`tab-${base.id}`}>
        {base.variants && (
          <div className="variants" role="radiogroup" aria-label={`${base.tab} type`}>
            {base.variants.map((v, i) => (
              <button
                key={v.id}
                role="radio"
                aria-checked={i === vIdx}
                className={i === vIdx ? 'variant on' : 'variant'}
                onClick={() => setVariantBy((m) => ({ ...m, [base.id]: i }))}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <DiagramCanvas key={viewKey} create={d.create} label={d.diagramLabel} />

        <div className="det-text">
          <div className="det-summary">
            <div className="mono-label accent">{d.kicker}</div>
            <p className="det-lead">{d.summary}</p>
            <dl className="det-meta">
              <div>
                <dt>Measures</dt>
                <dd>{d.measures}</dd>
              </div>
              <div>
                <dt>Best for</dt>
                <dd>{d.bestFor}</dd>
              </div>
            </dl>
            <div className="facts">
              {d.facts.map((f) => (
                <div key={f.label}>
                  <span>{f.label}</span>
                  <b>{f.value}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="det-chem">
            <div className="mono-label">The chemistry</div>
            {d.chemistry}
            <div className="watch">
              <span className="mono-label">Watch for</span>
              <p>{d.watchFor}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
