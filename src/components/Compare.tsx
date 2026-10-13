import { C } from '../detectors/draw/kit'

const ROWS = [
  { name: 'UV / PDA / DAD', color: C.uv, measures: 'Light absorbed', must: 'Have a chromophore', grad: 'Yes', lod: '~0.1–1 ng' },
  { name: 'Fluorescence', color: C.flu, measures: 'Light emitted', must: 'Fluoresce, or be derivatized', grad: 'Yes', lod: '~1–10 pg' },
  { name: 'Refractive index', color: C.ri, measures: 'Beam deflection (Δn)', must: 'Differ in n from the solvent', grad: 'No', lod: '~100 ng–1 µg' },
  { name: 'ELSD', color: C.elsd, measures: 'Light scattered by dried particles', must: 'Be non-volatile', grad: 'Yes', lod: '~1–50 ng' },
  { name: 'MS · single quad', color: C.ms, measures: 'Ions by m/z (scan or SIM)', must: 'Ionize', grad: 'Yes', lod: '~pg' },
  { name: 'MS/MS · triple quad', color: C.ms, measures: 'Precursor → product transitions (MRM)', must: 'Ionize and fragment', grad: 'Yes', lod: '~fg–low pg' },
]

const PICKS = [
  { q: 'Has a chromophore?', a: 'Start with UV (PDA / DAD) — robust, cheap, quantitative, and spectra come free.', color: C.uv },
  { q: 'Trace level, and it fluoresces (or can be tagged)?', a: 'Fluorescence buys orders of magnitude in sensitivity and ignores most of the matrix.', color: C.flu },
  { q: 'No chromophore, isocratic, plenty of sample?', a: 'Refractive index — the workhorse for sugars and polymers.', color: C.ri },
  { q: 'No chromophore, and you need a gradient?', a: 'ELSD.', color: C.elsd },
  { q: 'Need to confirm molecular weight?', a: 'A single-quad mass spectrometer.', color: C.ms },
  { q: 'Trace quantitation in a messy matrix?', a: 'A triple quad in MRM mode.', color: C.ms },
]

export function Compare() {
  return (
    <>
      <div className="table-wrap reveal">
        <table>
          <thead>
            <tr>
              <th>Detector</th>
              <th>Measures</th>
              <th>Analyte must…</th>
              <th>Gradient</th>
              <th>Typical LOD</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.name}>
                <td>
                  <i style={{ background: r.color }} />
                  {r.name}
                </td>
                <td>{r.measures}</td>
                <td>{r.must}</td>
                <td className={r.grad === 'Yes' ? 'yes' : 'no'}>{r.grad}</td>
                <td className="num">{r.lod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="picks reveal">
        {PICKS.map((p) => (
          <div key={p.q} className="pick" style={{ borderTopColor: p.color }}>
            <b>{p.q}</b>
            <span>{p.a}</span>
          </div>
        ))}
      </div>
      <p className="fine">Detection limits are order-of-magnitude, on-column figures; real performance depends on the instrument, method and analyte.</p>
    </>
  )
}
