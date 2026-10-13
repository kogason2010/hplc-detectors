import { C, Trace, beam, box, clamp, dot, elution, label, line, px, rand, readout, type Frame, type Schematic } from './kit'
import { layout } from './layout'
import { VIS_MAX, VIS_MIN, bandName, baseCss, isVisible, pixelCss } from './spectrum'

/** Typical PDA / DAD range: deuterium lamp for the UV, tungsten for the visible. */
const LMIN = 190
const LMAX = 800
const PIXELS = 153 // ≈4 nm per diode (real arrays have 512–1024; fewer here so each is visible)
const NM_PER_PX = (LMAX - LMIN) / (PIXELS - 1)
const ZOOM_HALF = 5 // loupe shows the hovered diode ±5 neighbours
const REF_NM = 273

/** Absorbance spectrum shape of the example analyte (caffeine: bands near 205 and 273 nm, colourless). */
const shape = (nm: number) => Math.exp(-(((nm - 273) / 17) ** 2)) + 0.75 * Math.exp(-(((nm - 207) / 13) ** 2))

/** Relative lamp output: D₂ hump in the UV, flat-ish tungsten continuum in the visible, roll-off below 200 nm. */
function lamp(nm: number) {
  const base = 0.72 + 0.28 * Math.exp(-(((nm - 235) / 55) ** 2))
  return nm < 205 ? base * (0.55 + (0.45 * (nm - LMIN)) / (205 - LMIN)) : base
}

const nmAt = (i: number) => LMIN + i * NM_PER_PX
const idxAt = (nm: number) => Math.round((nm - LMIN) / NM_PER_PX)

interface Mol {
  y: number
  x: number
  analyte: boolean
}

/** D₂/W lamp → flow cell → grating → photodiode array, with a hover loupe over the array. */
export function createUV(): Schematic {
  const trace = new Trace()
  const mols: Mol[] = Array.from({ length: 46 }, () => ({ x: rand(0, 1), y: rand(0, 1), analyte: false }))
  let A = 0 // peak absorbance at 273 nm
  // touch: remember the last diode tapped so the loupe stays open
  let pinned: number | null = null

  /** Transmitted intensity reaching diode i (lamp × 10^−A(λ)). */
  const intensity = (i: number) => {
    const nm = nmAt(i)
    return clamp(lamp(nm) * Math.pow(10, -A * 1.25 * shape(nm)))
  }
  const absorbance = (i: number) => A * 1.25 * shape(nmAt(i))

  return {
    step(dt, t) {
      const c = elution(t)
      A = 0.85 * c
      for (const m of mols) {
        m.y += dt * 0.32
        if (m.y > 1) {
          m.y -= 1
          m.x = rand(0, 1)
          m.analyte = Math.random() < c
        }
      }
      trace.push(A * 1000, dt)
      return A
    },

    draw(f) {
      const { cy, trace: tr } = layout(f)
      const T = Math.pow(10, -A)
      const { g } = f

      // lamp (D₂ for UV + tungsten for visible)
      const lx = 40
      box(f, lx, cy - 34, 92, 68)
      dot(f, lx + 46, cy, 9, '#f3f0ff', 1, 22)
      label(f, ['D₂ / W LAMP', 'LAMP'], lx, cy + 56)

      // broadband ("white") beam to the flow cell
      const cellX = 300
      const cellW = 62
      beam(f, lx + 92, cy, cellX, cy, '#eceaf6', 9, 0.75)

      // flow cell with eluent moving down through it
      const top = cy - 70
      const hgt = 140
      box(f, cellX, top, cellW, hgt, { fill: 'rgba(16,20,30,0.95)' })
      line(f, cellX + cellW / 2, top - 46, cellX + cellW / 2, top, C.strokeDim, 1)
      line(f, cellX + cellW / 2, top + hgt, cellX + cellW / 2, top + hgt + 46, C.strokeDim, 1)
      beam(f, cellX, cy, cellX + cellW, cy, '#eceaf6', 9, 0.35 + 0.4 * T)
      for (const m of mols) {
        const x = cellX + 7 + m.x * (cellW - 14)
        const y = top + 4 + m.y * (hgt - 8)
        if (m.analyte) dot(f, x, y, 4.2, C.uv, 0.95, 10)
        else dot(f, x, y, 2, C.label, 0.35)
      }
      label(f, ['FLOW CELL · 10 mm', 'CELL'], cellX + cellW / 2, top + hgt + 64, { align: 'center' })
      label(f, ['eluent ↓', ''], cellX + cellW / 2 + 12, top - 26, { size: 9 })

      // transmitted beam — still "white": the analyte only removes UV wavelengths
      const gx = 520
      beam(f, cellX + cellW, cy, gx, cy, '#eceaf6', 9, 0.75 * (0.55 + 0.45 * T))

      // grating
      g.save()
      g.translate(gx + 8, cy)
      g.rotate(0.38)
      box(f, -7, -46, 14, 92, { fill: C.steel, stroke: C.stroke })
      g.strokeStyle = 'rgba(255,255,255,0.18)'
      g.lineWidth = px(f, 1)
      for (let i = -42; i < 44; i += 6) {
        g.beginPath()
        g.moveTo(-7, i)
        g.lineTo(7, i)
        g.stroke()
      }
      g.restore()
      label(f, 'GRATING', gx + 8, cy + 76, { align: 'center' })

      // photodiode array geometry
      const ax = 820
      const aw = 24
      const span = Math.min(400, f.H * 0.66)
      const a0 = cy - span / 2
      const ph = span / PIXELS
      const yOf = (i: number) => a0 + i * ph + ph / 2
      const yOfNm = (nm: number) => a0 + ((nm - LMIN) / (LMAX - LMIN)) * span

      // dispersed rays (one per 3 diodes keeps it light)
      for (let i = 0; i < PIXELS; i += 3) {
        const nm = nmAt(i)
        line(f, gx + 14, cy, ax, yOf(i), baseCss(nm), 1, (isVisible(nm) ? 0.05 : 0.03) + 0.16 * intensity(i))
      }

      // diodes
      for (let i = 0; i < PIXELS; i++) {
        g.fillStyle = pixelCss(nmAt(i), intensity(i))
        g.fillRect(ax, a0 + i * ph, aw, Math.max(ph - px(f, 0.5), px(f, 0.6)))
      }
      // hatch the invisible UV and NIR regions so false colour reads as false colour
      const hatch = (y0: number, y1: number) => {
        g.save()
        g.beginPath()
        g.rect(ax, y0, aw, y1 - y0)
        g.clip()
        g.strokeStyle = 'rgba(10,13,19,0.55)'
        g.lineWidth = px(f, 1)
        for (let y = y0 - aw; y < y1; y += px(f, 5)) {
          g.beginPath()
          g.moveTo(ax, y + aw)
          g.lineTo(ax + aw, y)
          g.stroke()
        }
        g.restore()
      }
      hatch(a0, yOfNm(VIS_MIN))
      hatch(yOfNm(VIS_MAX), a0 + span)
      g.strokeStyle = C.strokeDim
      g.lineWidth = px(f, 1)
      g.strokeRect(ax - 3, a0 - 3, aw + 6, span + 6)

      // wavelength scale
      const sx = ax + aw + 6
      for (let nm = 200; nm <= LMAX; nm += 100) {
        const y = yOfNm(nm)
        line(f, sx, y, sx + 6, y, C.stroke, 1)
        label(f, String(nm), sx + 10, y + px(f, 3.5), { size: f.compact ? 8 : 9 })
      }
      label(f, 'nm', sx + 10, a0 - px(f, 8), { size: 8 })

      // region brackets: UV | visible | NIR
      const bx = sx + (f.compact ? 76 : 50)
      const bracket = (nm0: number, nm1: number, text: string, color: string) => {
        const y0 = yOfNm(nm0) + 2
        const y1 = yOfNm(nm1) - 2
        line(f, bx, y0, bx, y1, color, 1, 0.8)
        line(f, bx - 4, y0, bx, y0, color, 1, 0.8)
        line(f, bx - 4, y1, bx, y1, color, 1, 0.8)
        g.save()
        g.translate(bx + px(f, 10), (y0 + y1) / 2)
        g.rotate(Math.PI / 2)
        label(f, text, 0, 0, { size: 8, color, align: 'center', base: 'middle' })
        g.restore()
      }
      bracket(LMIN, VIS_MIN, 'UV', '#9d93c8')
      bracket(VIS_MIN, VIS_MAX, 'VISIBLE', '#c9d1de')
      if (!f.compact) bracket(VIS_MAX, LMAX, 'NIR', '#c08a8a')

      // 273 nm marker on the left edge
      const ry = yOf(idxAt(REF_NM))
      line(f, ax - 18, ry, ax - 4, ry, C.uv, 1.2)
      label(f, ['273', '273'], ax - 22, ry + px(f, 3.5), { size: 9, color: C.uv, align: 'right' })

      label(f, ['PHOTODIODE ARRAY', 'ARRAY'], ax + aw / 2, a0 + span + px(f, 22), { align: 'center' })
      label(f, [f.compact ? 'tap to zoom' : 'hover to zoom', 'tap to zoom'], ax + aw / 2, a0 + span + px(f, 36), {
        align: 'center',
        size: 8.5,
        color: C.uv,
      })

      // ---------- hover / tap loupe ----------
      const p = f.pointer
      let hovered: number | null = null
      if (p && p.x > ax - 40 && p.x < bx + 20 && p.y > a0 - 8 && p.y < a0 + span + 8) {
        hovered = clamp(Math.floor((p.y - a0) / ph), 0, PIXELS - 1)
        pinned = hovered
        f.cursor = 'zoom-in'
      } else if (p) {
        pinned = null // tapped / moved elsewhere
      }
      const focus = hovered ?? (f.pointer ? pinned : null)
      if (focus !== null) drawLoupe(f, focus, { ax, aw, a0, ph, cy })

      trace.draw(f, tr.x, tr.y, tr.w, tr.h, C.uv, ['OUTPUT · A₂₇₃ · mAU', 'OUTPUT · mAU'])
      readout(f, `λ 273 nm · A = ${A.toFixed(3)} AU`, ['caffeine absorbs only in the UV — the visible diodes stay bright', 'absorbs in UV only'])
    },
  }

  function drawLoupe(f: Frame, i: number, geo: { ax: number; aw: number; a0: number; ph: number; cy: number }) {
    const { g } = f
    const { ax, aw, a0, ph } = geo
    const i0 = clamp(i - ZOOM_HALF, 0, PIXELS - 1 - 2 * ZOOM_HALF)
    const n = ZOOM_HALF * 2 + 1

    // selection bracket on the array
    const selTop = a0 + i0 * ph
    const selBot = a0 + (i0 + n) * ph
    g.strokeStyle = '#ffffff'
    g.lineWidth = px(f, 1.2)
    g.strokeRect(ax - 4, selTop - px(f, 1), aw + 8, selBot - selTop + px(f, 2))

    // panel
    const W = px(f, 236)
    const H = px(f, 168)
    const x = f.compact ? px(f, 12) : ax - px(f, 36) - W
    const y = clamp((selTop + selBot) / 2 - H / 2, px(f, 8), f.H - H - px(f, 8))
    // leader lines from the selection to the panel
    line(f, ax - 4, selTop, x + W, y, '#ffffff', 1, 0.35)
    line(f, ax - 4, selBot, x + W, y + H, '#ffffff', 1, 0.35)
    box(f, x, y, W, H, { fill: 'rgba(8,10,15,0.96)', stroke: 'rgba(255,255,255,0.35)' })

    const pad = px(f, 10)
    const lo = nmAt(i0)
    const hi = nmAt(i0 + n - 1)
    label(f, `ZOOM · ${Math.round(lo)}–${Math.round(hi)} nm`, x + pad, y + px(f, 17), { size: 9, color: C.labelHi })
    label(f, `${n} diodes`, x + W - pad, y + px(f, 17), { size: 9, align: 'right' })

    // enlarged diodes
    const cellW = (W - pad * 2) / n
    const cellTop = y + px(f, 26)
    const cellH = px(f, 56)
    for (let k = 0; k < n; k++) {
      const idx = i0 + k
      const cx = x + pad + k * cellW
      g.fillStyle = pixelCss(nmAt(idx), intensity(idx))
      g.fillRect(cx + px(f, 1), cellTop, cellW - px(f, 2), cellH)
      if (!isVisible(nmAt(idx))) {
        // same hatch as the array: invisible light, false colour
        g.save()
        g.beginPath()
        g.rect(cx + px(f, 1), cellTop, cellW - px(f, 2), cellH)
        g.clip()
        g.strokeStyle = 'rgba(10,13,19,0.5)'
        g.lineWidth = px(f, 1)
        for (let yy = cellTop - cellW; yy < cellTop + cellH; yy += px(f, 6)) {
          g.beginPath()
          g.moveTo(cx, yy + cellW)
          g.lineTo(cx + cellW, yy)
          g.stroke()
        }
        g.restore()
      }
      // transmitted-fraction bar under each diode
      const T = intensity(idx)
      g.fillStyle = 'rgba(255,255,255,0.12)'
      g.fillRect(cx + px(f, 1), cellTop + cellH + px(f, 4), cellW - px(f, 2), px(f, 3))
      g.fillStyle = 'rgba(255,255,255,0.75)'
      g.fillRect(cx + px(f, 1), cellTop + cellH + px(f, 4), (cellW - px(f, 2)) * T, px(f, 3))
      if (k % 2 === 0) label(f, String(Math.round(nmAt(idx))), cx + cellW / 2, cellTop + cellH + px(f, 18), { size: 7.5, align: 'center' })
    }
    // highlight the hovered diode
    const hk = i - i0
    g.strokeStyle = '#ffffff'
    g.lineWidth = px(f, 1.5)
    g.strokeRect(x + pad + hk * cellW, cellTop - px(f, 2), cellW, cellH + px(f, 4))

    // readout for the hovered diode
    const nm = nmAt(i)
    const T = intensity(i) / lamp(nm)
    const Aλ = absorbance(i)
    const ty = cellTop + cellH + px(f, 36)
    label(f, `λ ${Math.round(nm)} nm`, x + pad, ty, { size: 10.5, color: C.labelHi, weight: 500 })
    label(f, isVisible(nm) ? bandName(nm) : nm < VIS_MIN ? 'ultraviolet · invisible' : 'near-IR · invisible', x + pad + px(f, 74), ty, {
      size: 9,
      color: isVisible(nm) ? baseCss(nm) : '#a59cd0',
    })
    label(f, `T ${(T * 100).toFixed(T > 0.995 ? 0 : 1)} %  ·  A ${Aλ.toFixed(3)} AU`, x + pad, ty + px(f, 15), { size: 9 })
  }
}
