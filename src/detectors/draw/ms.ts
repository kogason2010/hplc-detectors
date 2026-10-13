import { C, Trace, beam, box, dot, elution, gauss, label, line, px, rand, type Frame, type Schematic } from './kit'
import { layout } from './layout'

/*
 * Two mass-spec views share the same electrospray source:
 *   createSingleQuad  — one quadrupole scanning m/z, recording a full spectrum
 *   createTripleQuad  — Q1 selects a precursor, q2 fragments it, Q3 selects a product (MRM)
 *
 * Speeds are deliberately slow so the physics can be followed by eye.
 */

const ION_SPEED = 120 // logical units / s
const PHASE_RATE = 10 // radial oscillation rate (rad/s) — sets the visible "corkscrew" pitch
const GROW = 1.5 // how fast unstable trajectories spiral out (1/s)
const ROD_GAP = 40

// Example analyte (caffeine-like): [M+H]⁺ 195, sodium adduct 217, main product ion 138
const ANALYTE = 195
const ADDUCT = 217
const PRODUCT = 138
const PRODUCT_2 = 110
const BACKGROUND = [122, 149, 163, 239]
const ISOBARIC_PRODUCT = 152 // a matrix ion that happens to share m/z 195 but fragments differently

const COL_ANALYTE = C.ms
const COL_BG = '#8f9bff'
const COL_PRODUCT = '#ffb36b'
const COL_PRODUCT_2 = '#ffe08a'

interface Ion {
  x: number
  y0: number
  mz: number
  amp: number
  ph: number
  analyte: boolean
  /** stability is decided as the ion enters a set of rods (the scan is slow compared with the flight time) */
  stable: boolean | null
  stage: 0 | 1 | 2 // which rod set it is in (triple quad)
}
interface Puff {
  x: number
  y: number
  life: number
  col: string
}

/* ---------------- shared electrospray source ---------------- */
function makeSource(endX: number) {
  const plume: { x: number; y: number; life: number }[] = []
  return {
    step(dt: number) {
      if (Math.random() < dt * 40) plume.push({ x: 140, y: gauss() * 3, life: 1.1 })
      for (let i = plume.length - 1; i >= 0; i--) {
        const p = plume[i]
        p.x += dt * 95
        p.y *= 1 + dt * 1.5
        p.life -= dt
        if (p.life <= 0 || p.x > endX - 20) plume.splice(i, 1)
      }
    },
    draw(f: Frame, cy: number) {
      const { g } = f
      line(f, 20, cy, 124, cy, '#9aa3b4', 2.4)
      g.fillStyle = C.ms
      g.globalAlpha = 0.85
      g.beginPath()
      g.moveTo(124, cy - 5)
      g.lineTo(142, cy)
      g.lineTo(124, cy + 5)
      g.closePath()
      g.fill()
      g.globalAlpha = 1
      label(f, ['ESI · +3.5 kV', 'ESI +'], 20, cy + 30)
      for (const p of plume) dot(f, p.x, cy + p.y, 1.2 + 2 * p.life, '#ffa3d2', Math.min(1, p.life * 1.4))
      // sampling cone
      line(f, endX - 24, cy - 80, endX, cy - 9, C.stroke, 2)
      line(f, endX - 24, cy + 80, endX, cy + 9, C.stroke, 2)
    },
  }
}

function drawRods(f: Frame, cy: number, x0: number, x1: number, rf: number, opts: { dashed?: boolean } = {}) {
  const a = 0.22 + 0.16 * rf
  const b = 0.22 - 0.16 * rf
  if (opts.dashed) {
    // collision cell: RF-only ion guide, drawn lighter
    const { g } = f
    g.setLineDash([px(f, 5), px(f, 4)])
    line(f, x0, cy - ROD_GAP - 7, x1, cy - ROD_GAP - 7, C.stroke, 1.4)
    line(f, x0, cy + ROD_GAP + 7, x1, cy + ROD_GAP + 7, C.stroke, 1.4)
    g.setLineDash([])
    box(f, x0, cy - ROD_GAP - 20, x1 - x0, (ROD_GAP + 20) * 2, { fill: 'rgba(160,175,205,0.03)', stroke: C.strokeDim })
    return
  }
  box(f, x0, cy - ROD_GAP - 14, x1 - x0, 14, { fill: `rgba(255,98,180,${Math.max(0.06, a)})` })
  box(f, x0, cy + ROD_GAP, x1 - x0, 14, { fill: `rgba(92,200,255,${Math.max(0.06, b)})` })
}

function ionColor(o: Ion) {
  if (o.mz === PRODUCT) return COL_PRODUCT
  if (o.mz === PRODUCT_2) return COL_PRODUCT_2
  if (o.mz === ISOBARIC_PRODUCT) return COL_BG
  return o.analyte ? COL_ANALYTE : COL_BG
}

/** Advance an ion's radial motion. Returns true if it hit a rod. */
function moveRadial(o: Ion, dt: number) {
  o.ph += dt * PHASE_RATE
  if (o.stable === false) o.amp *= Math.exp(dt * GROW)
  else o.amp += (7 - o.amp) * Math.min(1, dt * 0.8)
  return o.amp > ROD_GAP - 2
}

/* =================================================================== */
/*                         SINGLE QUADRUPOLE                           */
/* =================================================================== */
const SQ_ROD0 = 330
const SQ_ROD1 = 770
const SQ_DET = 800
const MZ0 = 100
const MZ1 = 260
const SWEEP = 10 // seconds per full scan

export function createSingleQuad(): Schematic {
  const src = makeSource(286)
  const ions: Ion[] = []
  const puffs: Puff[] = []
  const counts = new Map<number, number>()
  let set = MZ0
  let lastSweep = -1
  let cy = 0
  let rf = 0
  let flash = 0
  let tic = 0

  return {
    step(dt, t, f) {
      cy = layout(f).cy
      rf = Math.sin(t * 3)
      const c = elution(t, 12, 0.16)
      set = MZ0 + 10 + ((t % SWEEP) / SWEEP) * (MZ1 - MZ0 - 20)
      const sweepIdx = Math.floor(t / SWEEP)
      if (sweepIdx !== lastSweep) {
        lastSweep = sweepIdx
        counts.forEach((v, k) => counts.set(k, v * 0.35))
      }
      src.step(dt)

      if (Math.random() < dt * 14) {
        const r = Math.random()
        const analyte = r < 0.1 + 0.6 * c
        const mz = analyte ? (Math.random() < 0.8 ? ANALYTE : ADDUCT) : BACKGROUND[Math.floor(Math.random() * BACKGROUND.length)]
        ions.push({ x: 290, y0: 0, mz, amp: rand(3, 9), ph: rand(0, 6.28), analyte, stable: null, stage: 0 })
      }
      tic = 0
      for (let i = ions.length - 1; i >= 0; i--) {
        const o = ions[i]
        o.x += dt * ION_SPEED
        if (o.x > SQ_ROD0) {
          if (o.stable === null) o.stable = Math.abs(o.mz - set) < 6
          if (moveRadial(o, dt)) {
            puffs.push({ x: o.x, y: cy + Math.sign(Math.sin(o.ph)) * ROD_GAP, life: 0.5, col: ionColor(o) })
            ions.splice(i, 1)
            continue
          }
        } else o.ph += dt * PHASE_RATE
        if (o.x >= SQ_DET) {
          counts.set(o.mz, (counts.get(o.mz) ?? 0) + 1)
          tic++
          flash = 1
          ions.splice(i, 1)
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) if ((puffs[i].life -= dt) <= 0) puffs.splice(i, 1)
      flash = Math.max(0, flash - dt * 2.5)
      return tic
    },

    draw(f) {
      const { g } = f
      src.draw(f, cy)
      label(f, ['CONE', ''], 262, cy - 92, { size: 9 })
      drawRods(f, cy, SQ_ROD0, SQ_ROD1, rf)
      label(f, ['SINGLE QUADRUPOLE · RF + DC', 'SINGLE QUAD'], SQ_ROD0, cy - 66)
      label(f, [`scanning · passing m/z ${Math.round(set)}`, `m/z ${Math.round(set)}`], SQ_ROD1, cy - 66, { align: 'right', color: COL_PRODUCT })

      for (const o of ions) {
        const st = o.stable !== false
        dot(f, o.x, cy + o.amp * Math.sin(o.ph), st ? 3.4 : 2.8, ionColor(o), st ? 1 : 0.65, st ? 9 : 0)
      }
      for (const p of puffs) dot(f, p.x, p.y, 4 + (1 - p.life * 2) * 6, p.col, p.life * 1.4)

      box(f, SQ_DET, cy - 34, 34, 68, { fill: `rgba(255,98,180,${0.08 + 0.4 * flash})` })
      label(f, ['DETECTOR', 'DET.'], SQ_DET + 17, cy + 54, { align: 'center' })
      beam(f, SQ_DET + 34, cy, SQ_DET + 60, cy, C.ms, 2, flash * 0.8)

      // spectrum being recorded
      const sx = 60
      const sw = 880
      const sTop = f.compact ? cy + 150 : cy + 112
      const sBot = f.H - px(f, 34)
      line(f, sx, sBot, sx + sw, sBot, C.stroke)
      const xOf = (mz: number) => sx + ((mz - MZ0) / (MZ1 - MZ0)) * sw
      const step = f.compact ? 40 : 20
      for (let m = MZ0; m <= MZ1; m += step) {
        line(f, xOf(m), sBot, xOf(m), sBot + px(f, 4), C.stroke)
        label(f, String(m), xOf(m), sBot + px(f, 16), { align: 'center', size: 9 })
      }
      label(f, 'm/z →', sx + sw, sBot - px(f, 6), { align: 'right', size: 9 })
      label(f, ['FULL-SCAN SPECTRUM · ION COUNT', 'FULL SCAN'], sx, sTop - px(f, 4), { size: 9 })
      let max = 4
      counts.forEach((v) => (max = Math.max(max, v)))
      counts.forEach((v, mz) => {
        const h = (v / max) * (sBot - sTop - px(f, 18))
        const col = mz === ANALYTE || mz === ADDUCT ? COL_ANALYTE : COL_BG
        g.fillStyle = col
        g.fillRect(xOf(mz) - px(f, 1.5), sBot - h, px(f, 3), h)
        if (mz === ANALYTE && v / max > 0.3) label(f, ['195.09 [M+H]⁺', '195'], xOf(mz) + px(f, 6), sBot - h + px(f, 4), { size: 9, color: COL_ANALYTE })
        if (mz === ADDUCT && v / max > 0.3 && !f.compact) label(f, '217.07 [M+Na]⁺', xOf(mz) + px(f, 6), sBot - h + px(f, 4), { size: 9, color: COL_ANALYTE })
      })
      line(f, xOf(set), sTop + px(f, 6), xOf(set), sBot, COL_PRODUCT, 1, 0.8)
    },
  }
}

/* =================================================================== */
/*                         TRIPLE QUADRUPOLE                           */
/* =================================================================== */
const Q1_0 = 250
const Q1_1 = 440
const CELL0 = 470
const CELL1 = 640
const Q3_0 = 670
const Q3_1 = 850
const QQQ_DET = 875

export function createTripleQuad(): Schematic {
  const src = makeSource(226)
  const ions: Ion[] = []
  const puffs: Puff[] = []
  const gas = Array.from({ length: 34 }, () => ({ x: rand(CELL0 + 6, CELL1 - 6), y: rand(-ROD_GAP - 12, ROD_GAP + 12), ph: rand(0, 6.28) }))
  const trace = new Trace(360, 30) // 12 s window
  let cy = 0
  let rf = 0
  let flash = 0
  let sig = 0
  let raw = 0

  return {
    step(dt, t, f) {
      cy = layout(f).cy
      rf = Math.sin(t * 3)
      const c = elution(t, 12, 0.13)
      src.step(dt)

      if (Math.random() < dt * 12) {
        const r = Math.random()
        let mz: number
        let analyte = false
        if (r < 0.05 + 0.6 * c) {
          mz = ANALYTE
          analyte = true
        } else if (r < 0.2 + 0.6 * c) mz = ANALYTE // isobaric matrix ion: same m/z, different structure
        else mz = BACKGROUND[Math.floor(Math.random() * BACKGROUND.length)]
        ions.push({ x: 232, y0: 0, mz, amp: rand(3, 9), ph: rand(0, 6.28), analyte, stable: null, stage: 0 })
      }

      let hits = 0
      for (let i = ions.length - 1; i >= 0; i--) {
        const o = ions[i]
        o.x += dt * ION_SPEED
        // Q1: transmits precursor m/z 195 only
        if (o.stage === 0 && o.x > Q1_0) {
          if (o.stable === null) o.stable = o.mz === ANALYTE
          if (o.x > Q1_1 && o.stable) {
            o.stage = 1
            o.stable = true
          }
        }
        // q2: collision cell — precursors collide with gas and fragment
        if (o.stage === 1 && o.x > CELL0 + 40 && o.mz === ANALYTE) {
          puffs.push({ x: o.x, y: cy + o.amp * Math.sin(o.ph), life: 0.6, col: '#ffffff' })
          const products = o.analyte ? [PRODUCT, ...(Math.random() < 0.6 ? [PRODUCT_2] : [])] : [ISOBARIC_PRODUCT]
          ions.splice(i, 1)
          for (const mz of products) ions.push({ x: o.x, y0: 0, mz, amp: rand(4, 10), ph: rand(0, 6.28), analyte: o.analyte, stable: true, stage: 1 })
          continue
        }
        // Q3: transmits product m/z 138 only
        if (o.stage === 1 && o.x > Q3_0) {
          o.stage = 2
          o.stable = o.mz === PRODUCT
        }
        const inRods = (o.stage === 0 && o.x > Q1_0) || o.stage === 2
        if (inRods) {
          if (moveRadial(o, dt)) {
            puffs.push({ x: o.x, y: cy + Math.sign(Math.sin(o.ph)) * ROD_GAP, life: 0.5, col: ionColor(o) })
            ions.splice(i, 1)
            continue
          }
        } else {
          o.ph += dt * PHASE_RATE
          if (o.stage === 1) o.amp += (8 - o.amp) * Math.min(1, dt * 1.5) // RF-only guide keeps everything focused
        }
        if (o.x >= QQQ_DET) {
          hits++
          flash = 1
          ions.splice(i, 1)
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) if ((puffs[i].life -= dt) <= 0) puffs.splice(i, 1)
      for (const gp of gas) gp.ph += dt * 2
      flash = Math.max(0, flash - dt * 2.5)
      // two cascaded time constants turn discrete ion arrivals into a smooth peak, as detector electronics do
      raw += ((hits / Math.max(dt, 1e-3)) * 0.25 - raw) * Math.min(1, dt * 1.2)
      sig += (raw - sig) * Math.min(1, dt * 1.2)
      trace.push(sig, dt)
      return sig
    },

    draw(f) {
      src.draw(f, cy)

      drawRods(f, cy, Q1_0, Q1_1, rf)
      drawRods(f, cy, CELL0, CELL1, 0, { dashed: true })
      drawRods(f, cy, Q3_0, Q3_1, -rf)
      for (const gp of gas) dot(f, gp.x + Math.sin(gp.ph) * 3, cy + gp.y + Math.cos(gp.ph * 1.3) * 3, 1.5, C.label, 0.45)

      label(f, 'Q1', Q1_0, cy - 66, { color: C.labelHi, weight: 500 })
      label(f, ['selects precursor m/z 195', 'm/z 195'], Q1_0 + px(f, 26), cy - 66, { color: COL_ANALYTE, size: 9 })
      label(f, 'q2', CELL0, cy - 76, { color: C.labelHi, weight: 500 })
      label(f, ['collision cell · N₂ / Ar', 'CID'], CELL0 + px(f, 22), cy - 76, { size: 9 })
      label(f, 'Q3', Q3_0, cy - 66, { color: C.labelHi, weight: 500 })
      label(f, ['selects product m/z 138', 'm/z 138'], Q3_0 + px(f, 26), cy - 66, { color: COL_PRODUCT, size: 9 })

      for (const o of ions) {
        const st = o.stable !== false
        dot(f, o.x, cy + o.amp * Math.sin(o.ph), st ? 3.4 : 2.8, ionColor(o), st ? 1 : 0.65, st ? 9 : 0)
      }
      for (const p of puffs) dot(f, p.x, p.y, 4 + (1 - p.life * 1.6) * 7, p.col, Math.min(1, p.life * 1.4))

      box(f, QQQ_DET, cy - 34, 30, 68, { fill: `rgba(255,179,107,${0.08 + 0.4 * flash})` })
      label(f, ['DETECTOR', 'DET.'], QQQ_DET + 15, cy + 54, { align: 'center' })

      // legend
      if (!f.compact) {
        const ly = cy + 86
        const items: [string, string][] = [
          [COL_ANALYTE, 'analyte precursor 195'],
          [COL_BG, 'matrix / background ions'],
          [COL_PRODUCT, 'product ion 138'],
          [COL_PRODUCT_2, 'other fragment 110'],
        ]
        items.forEach(([col, txt], i) => {
          dot(f, 70 + i * 220, ly, 3.4, col)
          label(f, txt, 82 + i * 220, ly + px(f, 3.5), { size: 9 })
        })
      }

      // MRM chromatogram
      const tTop = f.compact ? cy + 150 : cy + 112
      const tBot = f.H - px(f, 18)
      trace.draw(f, 60, tTop, 880, tBot - tTop, COL_PRODUCT, ['MRM CHROMATOGRAM · 195.1 → 138.1 · counts', 'MRM 195 → 138'])
    },
  }
}
