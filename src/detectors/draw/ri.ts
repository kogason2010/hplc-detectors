import { C, Trace, beam, box, clamp, dot, elution, label, line, px, rand, readout, type Schematic } from './kit'
import { layout } from './layout'

/** Laser through a diagonally split cell; analyte in the sample half deflects the beam onto a split photodiode. */
export function createRI(): Schematic {
  const trace = new Trace()
  // dissolved analyte, only ever in the sample (lower-right) triangle
  const solute = Array.from({ length: 70 }, () => {
    let x = 0
    let y = 0
    do {
      x = rand(0.04, 0.96)
      y = rand(0.04, 0.96)
    } while (y < x + 0.06) // y measured downward: lower-right triangle is y > x
    return { x, y, r: Math.random(), ph: rand(0, 6.28) }
  })
  let c = 0

  return {
    step(dt, t) {
      c = elution(t)
      trace.push(c * 48, dt)
      return c
    },

    draw(f, t) {
      const { cy, trace: tr } = layout(f)
      const { g } = f

      // laser
      box(f, 40, cy - 22, 110, 44)
      dot(f, 150, cy, 4, '#bff4ff', 1, 14)
      label(f, ['LASER · 660 nm', 'LASER'], 40, cy + 42)
      beam(f, 150, cy, 380, cy, C.ri, 3, 0.95)

      // split cell
      const x0 = 380
      const S = 170
      const y0 = cy - S / 2
      // reference half (upper-left)
      g.fillStyle = 'rgba(16,20,30,0.95)'
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x0 + S, y0)
      g.lineTo(x0, y0 + S)
      g.closePath()
      g.fill()
      // sample half (lower-right), tinted by concentration
      g.fillStyle = `rgba(92,200,255,${0.05 + 0.22 * c})`
      g.beginPath()
      g.moveTo(x0 + S, y0)
      g.lineTo(x0 + S, y0 + S)
      g.lineTo(x0, y0 + S)
      g.closePath()
      g.fill()
      g.strokeStyle = C.stroke
      g.lineWidth = px(f, 1)
      g.strokeRect(x0, y0, S, S)
      line(f, x0 + S, y0, x0, y0 + S, C.ri, 1.4, 0.8)
      for (const p of solute) {
        if (p.r > c) continue
        dot(f, x0 + p.x * S + Math.sin(t * 2 + p.ph) * 1.5, y0 + p.y * S, 2.6, C.ri, 0.85, 6)
      }
      beam(f, x0, cy, x0 + S, cy, C.ri, 3, 0.55)
      label(f, 'REF', x0 + 10, y0 + px(f, 16), { size: 9 })
      label(f, 'SAMPLE', x0 + S - 8, y0 + S - px(f, 8), { size: 9, align: 'right', color: C.ri })
      label(f, ['SPLIT CELL', 'CELL'], x0 + S / 2, y0 + S + px(f, 22), { align: 'center' })

      // deflected exit beam (exaggerated)
      const dx = 860 - (x0 + S)
      const theta = 0.085 * c
      const hy = cy - Math.tan(theta) * dx
      beam(f, x0 + S, cy, 860, hy, C.ri, 3, 0.95)
      line(f, x0 + S, cy, 860, cy, C.strokeDim, 1, 0.6)
      g.setLineDash([px(f, 3), px(f, 4)])
      line(f, x0 + S, cy, 860, cy, C.strokeDim, 1)
      g.setLineDash([])
      if (theta > 0.01) label(f, ['θ ∝ Δn', 'θ'], x0 + S + 60, cy + px(f, 14), { size: 9, color: C.ri })

      // split photodiode A / B
      const halfH = 46
      const fracA = clamp(0.5 + (cy - hy) / 40)
      box(f, 860, cy - halfH - 2, 26, halfH, { fill: `rgba(92,200,255,${0.08 + 0.6 * fracA})`, stroke: C.stroke })
      box(f, 860, cy + 2, 26, halfH, { fill: `rgba(92,200,255,${0.08 + 0.6 * (1 - fracA)})`, stroke: C.stroke })
      dot(f, 860, hy, 5, '#ffffff', 0.95, 16)
      label(f, 'A', 896, cy - halfH / 2 + px(f, 4), { size: 9, color: C.labelHi })
      label(f, 'B', 896, cy + halfH / 2 + px(f, 4), { size: 9, color: C.labelHi })
      label(f, ['SPLIT PHOTODIODE', 'DIODE'], 873, cy + halfH + px(f, 22), { align: 'center' })

      // A − B bars
      if (!f.compact) {
        const bx = 920
        line(f, bx, cy - 40, bx, cy + 40, C.strokeDim)
        const v = (fracA - 0.5) * 2
        box(f, bx, cy - 6, Math.max(1, v * 50), 12, { fill: C.ri, stroke: C.ri })
        label(f, 'A−B', bx, cy - 50, { size: 9 })
      }

      trace.draw(f, tr.x, tr.y, tr.w, tr.h, C.ri, ['OUTPUT · Δn · µRIU', 'OUTPUT · µRIU'])
      readout(f, `Δn = +${(c * 48).toFixed(1)} × 10⁻⁶ RIU`, ['deflection exaggerated for clarity · isocratic only', 'deflection exaggerated'])
    },
  }
}
