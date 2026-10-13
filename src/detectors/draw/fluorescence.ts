import { C, Trace, beam, box, dot, elution, label, line, px, rand, readout, type Schematic } from './kit'
import { layout } from './layout'

interface Mol {
  x: number
  y: number
  vx: number
  vy: number
  analyte: boolean
  flash: number
}
interface Photon {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

const EX = '#9b7dff'

/** Excitation beam through a cuvette; emission collected at 90° by a PMT. */
export function createFluorescence(): Schematic {
  const trace = new Trace()
  const HALF = 62
  const CX = 470
  const mols: Mol[] = Array.from({ length: 16 }, () => ({ x: rand(-1, 1), y: rand(-1, 1), vx: rand(-1, 1), vy: rand(-1, 1), analyte: false, flash: 0 }))
  const photons: Photon[] = []
  const exc = Array.from({ length: 26 }, () => rand(0, 1))
  let sig = 0
  let cy = 0

  return {
    step(dt, t, f) {
      cy = layout(f).cy
      const c = elution(t)
      let hits = 0
      for (const m of mols) {
        m.x += m.vx * dt * 0.45
        m.y += m.vy * dt * 0.45
        if (Math.abs(m.x) > 0.88) m.vx *= -1
        if (Math.abs(m.y) > 0.88) m.vy *= -1
        if (Math.random() < dt * 0.6) m.analyte = Math.random() < c
        m.flash = Math.max(0, m.flash - dt * 3)
        // excited only while inside the excitation beam
        if (m.analyte && Math.abs(m.y * HALF) < 13 && Math.random() < dt * 9) {
          m.flash = 1
          for (let k = 0; k < 3; k++) {
            const a = Math.random() * Math.PI * 2
            photons.push({ x: CX + m.x * HALF, y: cy + m.y * HALF, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, life: 1.4 })
          }
        }
      }
      for (let i = photons.length - 1; i >= 0; i--) {
        const p = photons[i]
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life -= dt
        // photons heading up through the emission filter reach the PMT
        if (p.y < cy - 165 && Math.abs(p.x - CX) < 48) {
          hits++
          photons.splice(i, 1)
        } else if (p.life <= 0) photons.splice(i, 1)
      }
      for (let i = 0; i < exc.length; i++) exc[i] = (exc[i] + dt * 0.55) % 1
      // photon arrival rate at the PMT, smoothed like a detector time constant
      sig += ((hits / Math.max(dt, 1e-3)) * 0.12 - sig) * Math.min(1, dt * 1.3)
      trace.push(sig, dt)
      return sig
    },

    draw(f) {
      const { trace: tr } = layout(f)
      const em = Math.min(1, sig)

      // excitation source + filter
      box(f, 40, cy - 30, 96, 60)
      dot(f, 88, cy, 7, '#d9ceff', 1, 18)
      label(f, ['EXCITATION', 'SOURCE'], 40, cy + 50)
      label(f, ['λex 280 nm', 'λex 280'], 40, cy + 50 + px(f, 14), { color: EX })
      box(f, 196, cy - 26, 8, 52, { fill: 'rgba(155,125,255,0.3)', stroke: EX })
      label(f, ['EX FILTER', ''], 200, cy - 36, { align: 'center', size: 9 })
      beam(f, 136, cy, CX - HALF, cy, EX, 8, 0.9)
      beam(f, CX - HALF, cy, CX + HALF, cy, EX, 8, 0.45)
      beam(f, CX + HALF, cy, 790, cy, EX, 8, 0.55)
      for (const u of exc) dot(f, 136 + u * (790 - 136), cy + Math.sin(u * 90) * 2, 2.2, '#cdbfff', 0.7)

      // beam dump
      box(f, 790, cy - 32, 52, 64, { fill: '#07090d' })
      label(f, ['BEAM DUMP', 'DUMP'], 816, cy + 52, { align: 'center' })

      // emission cone toward the PMT
      const { g } = f
      const grad = g.createLinearGradient(0, cy - HALF, 0, cy - 175)
      grad.addColorStop(0, `rgba(63,224,160,${0.05 + 0.4 * em})`)
      grad.addColorStop(1, `rgba(63,224,160,${0.02 + 0.18 * em})`)
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(CX - 30, cy - HALF)
      g.lineTo(CX + 30, cy - HALF)
      g.lineTo(CX + 46, cy - 168)
      g.lineTo(CX - 46, cy - 168)
      g.closePath()
      g.fill()

      // emission filter + PMT
      box(f, CX - 56, cy - 118, 112, 8, { fill: 'rgba(63,224,160,0.28)', stroke: C.flu })
      label(f, ['EM FILTER', ''], CX + 66, cy - 110, { size: 9 })
      box(f, CX - 46, cy - 222, 92, 54)
      box(f, CX - 32, cy - 172, 64, 4, { fill: C.flu, stroke: C.flu })
      g.globalAlpha = 0.25 + 0.75 * em
      dot(f, CX, cy - 170, 3, C.flu, 1, 16)
      g.globalAlpha = 1
      label(f, ['PMT · 90°', 'PMT'], CX + 58, cy - 200)
      label(f, ['λem 340 nm', 'λem 340'], CX + 58, cy - 200 + px(f, 14), { color: C.flu })

      // cuvette
      box(f, CX - HALF, cy - HALF, HALF * 2, HALF * 2, { fill: 'rgba(14,18,27,0.6)' })
      for (const m of mols) {
        const x = CX + m.x * HALF
        const y = cy + m.y * HALF
        if (m.analyte) dot(f, x, y, 4 + m.flash * 2.5, m.flash > 0.1 ? '#d8fff0' : C.flu, 0.6 + 0.4 * m.flash, 6 + m.flash * 14)
        else dot(f, x, y, 2, C.label, 0.3)
      }
      for (const p of photons) dot(f, p.x, p.y, 2.2, C.flu, Math.min(1, p.life))

      // Stokes shift inset
      if (!f.compact) {
        const ix = 700
        const iy = cy - 222
        const iw = 250
        const ih = 120
        box(f, ix, iy, iw, ih, { fill: 'rgba(10,13,19,0.85)', stroke: C.strokeDim })
        const base = iy + ih - 26
        line(f, ix + 14, base, ix + iw - 14, base, C.strokeDim)
        const curve = (center: number, color: string) => {
          g.strokeStyle = color
          g.lineWidth = px(f, 1.6)
          g.beginPath()
          for (let k = 0; k <= 60; k++) {
            const nm = 240 + (k / 60) * 160
            const X = ix + 14 + (k / 60) * (iw - 28)
            const Y = base - (ih - 50) * Math.exp(-(((nm - center) / 18) ** 2))
            if (k) g.lineTo(X, Y)
            else g.moveTo(X, Y)
          }
          g.stroke()
        }
        curve(280, EX)
        curve(340, C.flu)
        label(f, 'EX', ix + 14 + ((280 - 240) / 160) * (iw - 28), iy + 18, { align: 'center', color: EX, size: 9 })
        label(f, 'EM', ix + 14 + ((340 - 240) / 160) * (iw - 28), iy + 18, { align: 'center', color: C.flu, size: 9 })
        label(f, 'STOKES SHIFT · 60 nm', ix + 14, base + 18, { size: 9 })
      }

      trace.draw(f, tr.x, tr.y, tr.w, tr.h, C.flu, ['OUTPUT · EMISSION · RFU', 'OUTPUT · RFU'])
      readout(f, `λex 280 → λem 340 nm · ${Math.round(sig * 100)} RFU`, ['detector sees emitted light against a dark background', 'light against darkness'])
    },
  }
}

