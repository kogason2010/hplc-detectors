import { C, Trace, beam, box, dot, elution, gauss, label, line, px, rand, readout, type Schematic } from './kit'
import { layout } from './layout'

interface Drop {
  x: number
  y: number
  r0: number
  analyte: boolean
  core: number
}
interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

const TUBE0 = 170
const TUBE1 = 600
const LASER_X = 720

/** Nebulize → evaporate the mobile phase in a heated drift tube → dried particles scatter a laser. */
export function createELSD(): Schematic {
  const trace = new Trace()
  const drops: Drop[] = []
  const sparks: Spark[] = []
  const vapour = Array.from({ length: 50 }, () => ({ x: rand(TUBE0, TUBE1), y: rand(-1, 1), u: Math.random() }))
  let spawn = 0
  let sig = 0
  let cy = 0
  let flashes = 0

  return {
    step(dt, t, f) {
      cy = layout(f).cy
      const c = elution(t, 7.5)
      spawn += dt * 16
      while (spawn > 1) {
        spawn -= 1
        const analyte = Math.random() < 0.08 + 0.92 * c
        drops.push({ x: 140, y: gauss() * 12, r0: rand(6, 10), analyte, core: analyte ? rand(2.2, 3.6) * (0.6 + 0.6 * c) : 0 })
      }
      let hits = 0
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]
        const prev = d.x
        d.x += dt * 150
        // the plume widens as it leaves the nebulizer, then flows down the tube
        d.y += d.y * dt * (d.x < 260 ? 1.6 : 0)
        d.y = Math.max(-58, Math.min(58, d.y)) // stay inside the tube walls
        if (d.analyte && prev < LASER_X && d.x >= LASER_X) {
          hits++
          for (let k = 0; k < 7; k++) {
            const a = Math.random() * Math.PI * 2
            const v = rand(80, 200)
            sparks.push({ x: LASER_X, y: cy + d.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.45 })
          }
        }
        if (d.x > 900) drops.splice(i, 1)
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.life -= dt
        if (s.life <= 0) sparks.splice(i, 1)
      }
      for (const v of vapour) {
        v.u += dt * 0.5
        if (v.u > 1) {
          v.u = 0
          v.x = rand(TUBE0 + 40, TUBE1)
          v.y = rand(-1, 1)
        }
      }
      flashes = Math.max(0, flashes - dt * 4) + hits
      sig += ((hits / Math.max(dt, 1e-3)) * 0.07 - sig) * Math.min(1, dt * 2)
      trace.push(sig, dt)
      return sig
    },

    draw(f) {
      const { trace: tr } = layout(f)
      const { g } = f

      // nebulizer + N₂ inlet
      g.fillStyle = C.fill
      g.strokeStyle = C.stroke
      g.lineWidth = px(f, 1)
      g.beginPath()
      g.moveTo(60, cy - 26)
      g.lineTo(140, cy - 6)
      g.lineTo(140, cy + 6)
      g.lineTo(60, cy + 26)
      g.closePath()
      g.fill()
      g.stroke()
      line(f, 10, cy, 60, cy, C.stroke, 1.6)
      line(f, 100, cy - 70, 100, cy - 18, C.stroke, 1.2)
      label(f, 'N₂', 100, cy - 78, { align: 'center', color: C.labelHi })
      label(f, ['NEBULIZER', 'NEB.'], 60, cy + 48)
      label(f, ['eluent →', ''], 10, cy - 10, { size: 9 })

      // heated drift tube
      const th = 70
      g.fillStyle = 'rgba(255,138,92,0.035)'
      g.fillRect(TUBE0, cy - th, TUBE1 - TUBE0, th * 2)
      line(f, TUBE0, cy - th, TUBE1, cy - th, C.stroke)
      line(f, TUBE0, cy + th, TUBE1, cy + th, C.stroke)
      for (let x = TUBE0 + 12; x < TUBE1; x += 22) {
        line(f, x, cy - th - 7, x, cy - th, C.elsd, 1.4, 0.75)
        line(f, x, cy + th, x, cy + th + 7, C.elsd, 1.4, 0.75)
      }
      label(f, ['DRIFT TUBE · 50 °C', 'DRIFT · 50 °C'], TUBE0, cy - th - px(f, 16))
      label(f, ['solvent evaporates →', ''], TUBE1, cy + th + px(f, 24), { size: 9, align: 'right' })
      for (const v of vapour) dot(f, v.x + v.u * 20, cy + v.y * (th - 8) - v.u * 10, 1.4, '#9fc8ff', 0.35 * (1 - v.u))

      // laser + light trap + photodiode
      box(f, LASER_X - 18, cy - 210, 36, 34)
      label(f, 'LASER', LASER_X + 26, cy - 190)
      beam(f, LASER_X, cy - 176, LASER_X, cy + 150, C.laser, 3, 0.9)
      box(f, LASER_X - 20, cy + 150, 40, 18, { fill: '#07090d' })
      label(f, ['LIGHT TRAP', 'TRAP'], LASER_X + 28, cy + 164, { size: 9 })
      const pdx = 850
      const pdy = cy - 120
      const glow = Math.min(1, flashes * 0.5)
      box(f, pdx - 26, pdy - 26, 52, 52, { fill: `rgba(255,77,94,${0.06 + 0.35 * glow})` })
      label(f, ['PHOTODIODE', 'PD'], pdx, pdy + 46, { align: 'center' })
      g.setLineDash([px(f, 3), px(f, 4)])
      line(f, LASER_X, cy, pdx - 26, pdy + 18, C.laser, 1, 0.15 + 0.6 * glow)
      g.setLineDash([])

      // droplets: solvent shell shrinks; analyte core survives
      for (const d of drops) {
        const k = Math.max(0, Math.min(1, (d.x - TUBE0) / (TUBE1 - 40 - TUBE0)))
        const r = d.r0 * (1 - k)
        const y = cy + d.y
        if (r > 0.4) {
          g.globalAlpha = 0.55
          g.strokeStyle = '#a9d2ff'
          g.lineWidth = px(f, 1)
          g.beginPath()
          g.arc(d.x, y, r, 0, Math.PI * 2)
          g.stroke()
          g.fillStyle = 'rgba(150,200,255,0.12)'
          g.fill()
          g.globalAlpha = 1
        }
        if (d.analyte) dot(f, d.x, y, d.core, '#ffc28f', 1, 8)
      }
      for (const s of sparks) dot(f, s.x, s.y, 1.8, '#ffb0b8', Math.min(1, s.life * 2.5), 6)

      trace.draw(f, tr.x, tr.y, tr.w, tr.h, C.elsd, ['OUTPUT · SCATTER · mV', 'OUTPUT · mV'])
      readout(f, `N₂ 1.6 SLM · drift tube 50 °C`, ['only non-volatile analyte survives to scatter light', 'only solids scatter'])
    },
  }
}
