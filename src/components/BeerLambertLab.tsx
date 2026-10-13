import { useState } from 'react'

/** Interactive A = εbc calculator. */
export function BeerLambertLab() {
  const [eps, setEps] = useState(12000) // L·mol⁻¹·cm⁻¹
  const [b, setB] = useState(1) // cm
  const [c, setC] = useState(20) // µmol/L

  const A = eps * b * c * 1e-6
  const T = Math.pow(10, -A) * 100
  const tText = T < 0.01 ? T.toExponential(1) : T.toFixed(T < 10 ? 2 : 1)
  const note =
    A > 1.5
      ? 'Above ~1.5 AU only a few percent of light gets through, and stray light makes the response non-linear. Dilute, or use a shorter path.'
      : A < 0.001
        ? 'Below ~1 mAU you are approaching the noise floor of most detectors.'
        : 'Inside the comfortable linear range. Doubling c or b doubles A.'

  return (
    <div className="lab">
      <label>
        ε (L/mol·cm)
        <input type="range" min={100} max={50000} step={100} value={eps} onChange={(e) => setEps(+e.target.value)} />
        <output>{eps.toLocaleString()}</output>
      </label>
      <label>
        b (cm)
        <input type="range" min={0.3} max={6} step={0.1} value={b} onChange={(e) => setB(+e.target.value)} />
        <output>{b.toFixed(1)}</output>
      </label>
      <label>
        c (µmol/L)
        <input type="range" min={0} max={150} step={1} value={c} onChange={(e) => setC(+e.target.value)} />
        <output>{c}</output>
      </label>
      <div className="readout">
        <div>
          <small>ABSORBANCE</small>
          <b>{A.toFixed(3)} AU</b>
        </div>
        <div>
          <small>LIGHT TRANSMITTED</small>
          <b>{tText} %</b>
        </div>
      </div>
      <div className="tbar">
        <i style={{ width: `${Math.max(0.5, T)}%` }} />
      </div>
      <div className="note">{note}</div>
    </div>
  )
}
