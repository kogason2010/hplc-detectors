import { useEffect, useRef } from 'react'
import { C, LOGICAL_W, grid, type Frame, type Schematic } from './draw/kit'

const COMPACT_BELOW = 640 // CSS px

/**
 * Hosts one animated schematic. Handles device-pixel-ratio, resizing, the
 * taller phone layout, pausing when off screen, and reduced motion.
 */
export function DiagramCanvas({ create, label }: { create: () => Schematic; label: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvas.current!
    const el = wrap.current!
    const g = cv.getContext('2d')!
    const schematic = create()
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const frame: Frame = { g, W: LOGICAL_W, H: 520, s: 1, dpr: 1, compact: false, pointer: null, cursor: 'default' }
    let visible = true
    let raf = 0
    let last = performance.now()
    let t = 0

    const resize = () => {
      const w = el.clientWidth
      const compact = w < COMPACT_BELOW
      const h = Math.round(w * (compact ? 1.08 : 0.52))
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.style.height = `${h}px`
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      frame.s = w / LOGICAL_W
      frame.H = h / frame.s
      frame.dpr = dpr
      frame.compact = compact
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    // pointer → logical coordinates, for hover interactions (e.g. the PDA zoom)
    const toLogical = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      return { x: (e.clientX - r.left) / frame.s, y: (e.clientY - r.top) / frame.s }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') frame.pointer = toLogical(e)
    }
    const onDown = (e: PointerEvent) => (frame.pointer = toLogical(e)) // taps on touch screens
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') frame.pointer = null
    }
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerdown', onDown)
    cv.addEventListener('pointerleave', onLeave)
    let cursor = ''

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' })
    io.observe(el)

    // pre-run one full elution cycle so the scene, trace and spectrum are already populated
    for (let i = 0; i < 300; i++) schematic.step(1 / 30, (t += 1 / 30), frame)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000) * (reduced ? 0.35 : 1)
      last = now
      if (!visible) return
      t += dt
      schematic.step(dt, t, frame)
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, cv.width, cv.height)
      g.setTransform(frame.dpr * frame.s, 0, 0, frame.dpr * frame.s, 0, 0)
      grid(frame)
      frame.cursor = 'default'
      schematic.draw(frame, t)
      if (frame.cursor !== cursor) cv.style.cursor = cursor = frame.cursor
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      cv.removeEventListener('pointermove', onMove)
      cv.removeEventListener('pointerdown', onDown)
      cv.removeEventListener('pointerleave', onLeave)
    }
  }, [create])

  return (
    <div ref={wrap} className="diagram">
      <canvas ref={canvas} role="img" aria-label={label} style={{ background: 'transparent', color: C.label }} />
    </div>
  )
}
