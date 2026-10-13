/**
 * Shared 2D-canvas drawing kit for the detector schematics.
 *
 * Every schematic is drawn in a logical space 1000 units wide. Height varies
 * with the canvas aspect ratio (taller on phones). Line widths and label sizes
 * are given in CSS pixels and converted, so text stays crisp and readable at
 * any size.
 */

export const LOGICAL_W = 1000

export interface Frame {
  g: CanvasRenderingContext2D
  /** logical width (always 1000) and height */
  W: number
  H: number
  /** CSS px per logical unit */
  s: number
  dpr: number
  /** true on small canvases: use short labels */
  compact: boolean
  /** pointer position in logical units while hovering (or after a tap), else null */
  pointer: { x: number; y: number } | null
  /** a schematic can set this to change the mouse cursor over the canvas */
  cursor: string
}

export interface Schematic {
  /** advance the simulation; returns the detector's current output signal */
  step(dt: number, t: number, f: Frame): number
  draw(f: Frame, t: number): void
}

/* ---------- palette ---------- */
export const C = {
  grid: 'rgba(160,175,205,0.055)',
  gridStrong: 'rgba(160,175,205,0.09)',
  stroke: 'rgba(185,196,218,0.42)',
  strokeDim: 'rgba(185,196,218,0.2)',
  fill: 'rgba(22,28,40,0.92)',
  steel: '#4c5566',
  label: '#7a8496',
  labelHi: '#cfd6e2',
  white: '#e9edf5',
  uv: '#8f7dff',
  flu: '#3fe0a0',
  ri: '#5cc8ff',
  elsd: '#ff8a5c',
  laser: '#ff4d5e',
  ms: '#ff62b4',
}

/* ---------- maths ---------- */
export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export function gauss() {
  let u = 0
  let v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))

/**
 * Analyte concentration at the detector: a peak elutes every `period` seconds.
 * Shared by all schematics so the diagrams and their output traces agree.
 */
export function elution(t: number, period = 7, width = 0.11) {
  const u = (t % period) / period
  return Math.exp(-(((u - 0.5) / width) ** 2))
}

/* ---------- primitives ---------- */
export const px = (f: Frame, n: number) => n / f.s

let gridCache: { key: string; canvas: HTMLCanvasElement } | null = null
/** Background grid, rendered once per canvas size and then copied each frame. */
export function grid(f: Frame) {
  const pw = Math.round(f.W * f.s * f.dpr)
  const ph = Math.round(f.H * f.s * f.dpr)
  const key = `${pw}x${ph}`
  if (!gridCache || gridCache.key !== key) {
    const canvas = document.createElement('canvas')
    canvas.width = pw
    canvas.height = ph
    const g = canvas.getContext('2d')!
    g.setTransform(f.s * f.dpr, 0, 0, f.s * f.dpr, 0, 0)
    drawGrid({ ...f, g })
    gridCache = { key, canvas }
  }
  f.g.save()
  f.g.setTransform(1, 0, 0, 1, 0, 0)
  f.g.drawImage(gridCache.canvas, 0, 0)
  f.g.restore()
}

function drawGrid(f: Frame) {
  const { g, W, H } = f
  g.lineWidth = px(f, 1)
  const step = 40
  for (let x = step; x < W; x += step) {
    g.strokeStyle = x % 200 === 0 ? C.gridStrong : C.grid
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, H)
    g.stroke()
  }
  for (let y = step; y < H; y += step) {
    g.strokeStyle = y % 200 === 0 ? C.gridStrong : C.grid
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(W, y)
    g.stroke()
  }
}

export function box(f: Frame, x: number, y: number, w: number, h: number, opts: { fill?: string; stroke?: string; lw?: number } = {}) {
  const { g } = f
  g.fillStyle = opts.fill ?? C.fill
  g.fillRect(x, y, w, h)
  g.strokeStyle = opts.stroke ?? C.stroke
  g.lineWidth = px(f, opts.lw ?? 1)
  g.strokeRect(x, y, w, h)
}

export function line(f: Frame, x0: number, y0: number, x1: number, y1: number, color: string, lw = 1, alpha = 1) {
  const { g } = f
  g.globalAlpha = alpha
  g.strokeStyle = color
  g.lineWidth = px(f, lw)
  g.beginPath()
  g.moveTo(x0, y0)
  g.lineTo(x1, y1)
  g.stroke()
  g.globalAlpha = 1
}

/** A light beam: soft glow plus a brighter core. `width` is in logical units. */
export function beam(f: Frame, x0: number, y0: number, x1: number, y1: number, color: string, width: number, alpha = 1) {
  const { g } = f
  if (alpha <= 0.01) return
  g.save()
  g.lineCap = 'butt'
  g.strokeStyle = color
  // soft glow from stacked translucent strokes (no shadowBlur: it is very slow in canvas 2D)
  for (const [w, a] of [
    [width + px(f, 22), 0.05],
    [width + px(f, 10), 0.1],
    [width * 2.2, 0.16],
  ] as const) {
    g.globalAlpha = alpha * a
    g.lineWidth = w
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
  }
  g.globalAlpha = alpha * 0.9
  g.lineWidth = width
  g.beginPath()
  g.moveTo(x0, y0)
  g.lineTo(x1, y1)
  g.stroke()
  g.restore()
}

const glowSprites = new Map<string, HTMLCanvasElement>()
/** A pre-rendered radial glow per colour, stamped with drawImage. */
function glowSprite(color: string) {
  let c = glowSprites.get(color)
  if (c) return c
  c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, color)
  gr.addColorStop(0.25, color)
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.globalAlpha = 0.55
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  glowSprites.set(color, c)
  return c
}

/** A filled circle; `glow` is the halo radius in CSS px. */
export function dot(f: Frame, x: number, y: number, r: number, color: string, alpha = 1, glow = 0) {
  const { g } = f
  g.globalAlpha = alpha
  if (glow) {
    const R = r + px(f, glow)
    g.drawImage(glowSprite(color), x - R, y - R, R * 2, R * 2)
  }
  g.fillStyle = color
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.globalAlpha = 1
}

type Align = 'left' | 'center' | 'right'
/** Monospace label. `size` is in CSS px. Pass [long, short] to swap text on small canvases. */
export function label(
  f: Frame,
  text: string | [string, string],
  x: number,
  y: number,
  opts: { size?: number; color?: string; align?: Align; weight?: number; base?: CanvasTextBaseline } = {},
) {
  const { g } = f
  const t = Array.isArray(text) ? (f.compact ? text[1] : text[0]) : text
  if (!t) return
  const size = opts.size ?? (f.compact ? 9 : 10.5)
  g.font = `${opts.weight ?? 400} ${px(f, size)}px "IBM Plex Mono", ui-monospace, monospace`
  g.fillStyle = opts.color ?? C.label
  g.textAlign = opts.align ?? 'left'
  g.textBaseline = opts.base ?? 'alphabetic'
  // tracking for the uppercase technical-label look
  if ('letterSpacing' in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px(f, size * 0.08)}px`
  g.fillText(t, x, y)
}

/* ---------- output trace (bottom-right inset) ---------- */
export class Trace {
  buf: number[]
  private acc = 0
  private max = 0.2
  n: number
  hz: number
  constructor(n = 220, hz = 30) {
    this.n = n
    this.hz = hz
    this.buf = new Array(n).fill(0)
  }
  push(v: number, dt: number) {
    this.acc += dt
    while (this.acc > 1 / this.hz) {
      this.acc -= 1 / this.hz
      this.buf.push(v)
      this.buf.shift()
    }
    const m = Math.max(0.05, ...this.buf)
    const target = m * 1.15
    // grow quickly when a peak arrives, relax slowly afterwards
    this.max += (target - this.max) * (target > this.max ? 0.25 : 0.03)
  }
  draw(f: Frame, x: number, y: number, w: number, h: number, color: string, title: string | [string, string]) {
    const { g } = f
    box(f, x, y, w, h, { fill: 'rgba(10,13,19,0.85)', stroke: C.strokeDim })
    label(f, title, x + px(f, 8), y + px(f, 14), { size: f.compact ? 8 : 9 })
    const top = y + px(f, 22)
    const bot = y + h - px(f, 8)
    line(f, x + px(f, 8), bot, x + w - px(f, 8), bot, C.strokeDim)
    g.save()
    g.strokeStyle = color
    g.lineJoin = 'round'
    g.beginPath()
    this.buf.forEach((v, i) => {
      const X = x + px(f, 8) + (i / (this.n - 1)) * (w - px(f, 16))
      const Y = bot - Math.min(1, v / this.max) * (bot - top)
      if (i) g.lineTo(X, Y)
      else g.moveTo(X, Y)
    })
    // faint wide stroke underneath for glow, then the crisp line
    g.globalAlpha = 0.18
    g.lineWidth = px(f, 6)
    g.stroke()
    g.globalAlpha = 1
    g.lineWidth = px(f, 1.6)
    g.stroke()
    g.restore()
    const last = this.buf[this.n - 1]
    const X = x + w - px(f, 8)
    dot(f, X, bot - Math.min(1, last / this.max) * (bot - top), px(f, 2.4), color, 1, 8)
  }
}

/** Two lines of readout text in the bottom-left corner. */
export function readout(f: Frame, main: string, sub?: string | [string, string]) {
  const x = px(f, 18)
  const y = f.H - px(f, sub ? 30 : 16)
  label(f, main, x, y, { color: C.labelHi, weight: 500, size: f.compact ? 9 : 11 })
  if (sub) label(f, sub, x, y + px(f, 16), { size: f.compact ? 8 : 9.5 })
}
