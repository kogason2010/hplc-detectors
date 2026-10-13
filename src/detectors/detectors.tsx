import type { ReactNode } from 'react'
import { BeerLambertLab } from '../components/BeerLambertLab'
import { Jablonski } from '../components/Jablonski'
import { createELSD } from './draw/elsd'
import { createFluorescence } from './draw/fluorescence'
import { C, type Schematic } from './draw/kit'
import { createSingleQuad, createTripleQuad } from './draw/ms'
import { createRI } from './draw/ri'
import { createUV } from './draw/uv'

export interface Variant {
  id: string
  label: string
  create: () => Schematic
  diagramLabel: string
  kicker?: string
  summary?: string
  measures?: string
  bestFor?: string
  facts?: { label: string; value: string }[]
}

export interface Detector {
  id: string
  tab: string
  color: string
  kicker: string
  summary: string
  measures: string
  bestFor: string
  create: () => Schematic
  diagramLabel: string
  /** optional alternative views (e.g. single vs triple quadrupole); each overrides the fields it sets */
  variants?: Variant[]
  /** deeper chemistry shown beside the summary */
  chemistry: ReactNode
  watchFor: ReactNode
  facts: { label: string; value: string }[]
}

const Eq = ({ children, note }: { children: ReactNode; note: ReactNode }) => (
  <div className="eq">
    <div className="eq-main">{children}</div>
    <div className="eq-note">{note}</div>
  </div>
)

export const DETECTORS: Detector[] = [
  {
    id: 'uv',
    tab: 'UV / PDA / DAD',
    color: C.uv,
    kicker: 'Ultraviolet–visible · photodiode array (PDA / DAD)',
    summary:
      'Broadband light crosses the flow cell. Molecules with a chromophore absorb some wavelengths; a grating spreads what is left across a row of photodiodes, so every wavelength is read at once and each peak carries its own spectrum.',
    measures: 'Absorbance, A = εbc',
    bestFor: 'Chromophores · purity checks · routine quantitation',
    create: createUV,
    diagramLabel:
      'Animated schematic: broadband light from a deuterium/tungsten lamp passes through a flow cell, is dispersed by a grating and lands on a photodiode array covering 190–800 nm. Diodes darken at the wavelengths the analyte absorbs (in the UV for caffeine). Hover or tap the array to zoom into individual diodes and read their wavelength, transmittance and absorbance.',
    chemistry: (
      <>
        <p>
          A <strong>chromophore</strong> — conjugated π-bonds, an aromatic ring, a carbonyl — absorbs a photon whose energy (E = hc/λ) matches the gap
          between two electronic states. An electron is promoted, typically <strong>π→π*</strong> or <strong>n→π*</strong>, and that photon never reaches
          the detector. The shortfall is the signal.
        </p>
        <Eq note="ε = molar absorptivity at that λ · b = flow-cell path length · c = concentration">A = log₁₀(I₀ / I) = ε · b · c</Eq>
        <BeerLambertLab />
        <p>
          A single- or variable-wavelength UV detector picks one λ before the cell. A <strong>photodiode array</strong> — called a PDA or a DAD depending on the manufacturer; they are the same technique — passes all the light through the cell first, so it can
          read every wavelength at once — that is what makes peak-purity checks and spectral library matching possible.
        </p>
      </>
    ),
    watchFor: (
      <>
        The mobile phase absorbs too: acetonitrile is usable to ~190 nm, methanol only to ~205 nm. Response stays linear only up to roughly 1–1.5 AU.
      </>
    ),
    facts: [
      { label: 'Selectivity', value: 'Needs a chromophore' },
      { label: 'Gradient', value: 'Yes' },
      { label: 'Typical LOD', value: '~0.1–1 ng' },
    ],
  },
  {
    id: 'fld',
    tab: 'Fluorescence',
    color: C.flu,
    kicker: 'Fluorescence detection',
    summary:
      'Molecules absorb at an excitation wavelength and re-emit at a longer one. Emission is collected at 90° to the excitation beam, so the detector sees glowing analyte against an almost dark background.',
    measures: 'Emitted intensity at λem',
    bestFor: 'Native fluorophores · derivatized amines · trace levels',
    create: createFluorescence,
    diagramLabel: 'Animated schematic: a violet excitation beam crosses a cuvette; excited molecules emit green light in all directions, and a photomultiplier at 90 degrees collects it through an emission filter.',
    chemistry: (
      <>
        <p>
          After excitation to S₁ the molecule sheds a little energy as heat (vibrational relaxation, picoseconds), then returns to the ground state by
          emitting a photon (nanoseconds). Because energy was lost on the way, emission is always at a longer wavelength — the{' '}
          <strong>Stokes shift</strong>.
        </p>
        <Jablonski />
        <Eq note="Φ = quantum yield · I₀ = excitation intensity · valid for dilute solutions (A ≲ 0.05)">F ≈ 2.303 · Φ · I₀ · ε · b · c</Eq>
        <p>
          Measuring light against darkness, instead of a small dip in a bright beam, typically makes fluorescence 10–1000× more sensitive than UV. Native
          fluorophores include PAHs and tryptophan-containing peptides; OPA or FMOC derivatization makes amino acids glow.
        </p>
      </>
    ),
    watchFor: <>Quenching by dissolved O₂, halides or heavy atoms, and the inner-filter effect at high concentration, which flattens calibration.</>,
    facts: [
      { label: 'Selectivity', value: 'Very high' },
      { label: 'Gradient', value: 'Yes' },
      { label: 'Typical LOD', value: '~1–10 pg' },
    ],
  },
  {
    id: 'ri',
    tab: 'Refractive Index',
    color: C.ri,
    kicker: 'Differential refractive index',
    summary:
      'A beam crosses a cell split diagonally into reference and sample halves. When analyte changes the refractive index of the sample side, the beam bends and its spot moves across a split photodiode.',
    measures: 'Δn between sample and reference',
    bestFor: 'Sugars · polymers (GPC/SEC) · lipids · anything without a chromophore',
    create: createRI,
    diagramLabel: 'Animated schematic: a laser passes through a diagonally split cell; as analyte fills the sample half the exit beam tilts and its spot moves between the two halves of a photodiode.',
    chemistry: (
      <>
        <p>
          Light slows down in matter, and how much depends on what is dissolved in it. At the boundary between two liquids with different refractive
          indices the beam bends:
        </p>
        <Eq note="Signal ∝ Δn = n(sample) − n(reference)">n₁ · sin θ₁ = n₂ · sin θ₂</Eq>
        <p>
          While only mobile phase flows, both halves match and the beam goes straight. When a band arrives, n changes on one side of the diagonal, the
          beam tilts, and the imbalance between photodiode halves A and B becomes the signal. Almost every dissolved substance changes n, which makes
          RI <strong>universal</strong>.
        </p>
      </>
    ),
    watchFor: (
      <>
        n drifts ~10⁻⁴ RIU per °C, so the optics are tightly thermostatted. Any change in mobile-phase composition moves the baseline — RI is{' '}
        <strong>isocratic only</strong>. Peaks can be negative when the analyte's n is below the solvent's.
      </>
    ),
    facts: [
      { label: 'Selectivity', value: 'Universal' },
      { label: 'Gradient', value: 'No' },
      { label: 'Typical LOD', value: '~100 ng–1 µg' },
    ],
  },
  {
    id: 'elsd',
    tab: 'ELSD',
    color: C.elsd,
    kicker: 'Evaporative light scattering',
    summary:
      'The eluent is sprayed into droplets and dried in a heated tube. Volatile mobile phase disappears; non-volatile analyte is left as tiny particles that scatter a light beam onto a photodiode.',
    measures: 'Light scattered by dried particles',
    bestFor: 'Lipids · sugars · surfactants · excipients · gradient methods',
    create: createELSD,
    diagramLabel: 'Animated schematic: a nebulizer sprays droplets into a heated drift tube; the solvent shells shrink away and analyte particles cross a red laser, scattering light to a photodiode.',
    chemistry: (
      <>
        <ol className="steps">
          <li>
            <strong>Nebulize.</strong> Nitrogen shears the eluent into a mist of droplets.
          </li>
          <li>
            <strong>Evaporate.</strong> The drift tube boils off the mobile phase. Droplets carrying analyte shrink to dry particles; droplets with none
            simply vanish.
          </li>
          <li>
            <strong>Detect.</strong> Particles cross a light beam and scatter it. More analyte means bigger particles, and bigger particles scatter more
            light.
          </li>
        </ol>
        <Eq note="Scattering grows non-linearly with mass, so calibrate on log–log axes.">A = a · mᵇ → log A = b · log m + log a</Eq>
        <p>It sees anything that doesn't evaporate — and unlike RI it tolerates gradients, though response shifts with % organic.</p>
      </>
    ),
    watchFor: (
      <>
        Buffers must be volatile — formic acid, ammonium acetate or formate, never phosphate. Semi-volatile analytes evaporate along with the solvent and
        are lost.
      </>
    ),
    facts: [
      { label: 'Selectivity', value: 'Non-volatiles' },
      { label: 'Gradient', value: 'Yes' },
      { label: 'Typical LOD', value: '~1–50 ng' },
    ],
  },
  {
    id: 'ms',
    tab: 'Mass Spectrometry',
    color: C.ms,
    kicker: 'Electrospray ionization · single quadrupole',
    summary:
      'Eluent is sprayed into charged droplets that release gas-phase ions. In a single quadrupole, one set of rods passes only one mass-to-charge ratio at a time; sweeping it records a full mass spectrum for every point in the chromatogram.',
    measures: 'Ion abundance vs m/z',
    bestFor: 'Molecular-weight confirmation · co-eluting compounds · peak tracking',
    create: createSingleQuad,
    diagramLabel:
      'Animated schematic of a single quadrupole: ions from an electrospray needle enter one set of quadrupole rods; only ions at the m/z being scanned pass to the detector while others spiral into the rods, building up a full-scan mass spectrum below.',
    variants: [
      {
        id: 'sq',
        label: 'Single quadrupole',
        create: createSingleQuad,
        diagramLabel:
          'Animated schematic of a single quadrupole: ions from an electrospray needle enter one set of quadrupole rods; only ions at the m/z being scanned pass to the detector while others spiral into the rods, building up a full-scan mass spectrum below.',
      },
      {
        id: 'qqq',
        label: 'Triple quadrupole',
        kicker: 'Electrospray ionization · triple quadrupole (MS/MS)',
        summary:
          'Three stages in a row. Q1 lets through only the precursor ion, a collision cell breaks it into fragments, and Q3 lets through only one characteristic fragment. That precursor → product pair (a multiple reaction monitoring, or MRM, transition) is extremely specific.',
        measures: 'Ion counts for a precursor → product transition (MRM)',
        bestFor: 'Trace quantitation in complex matrices · bioanalysis · residues and contaminants',
        create: createTripleQuad,
        diagramLabel:
          'Animated schematic of a triple quadrupole: Q1 passes only precursor ions of m/z 195; in the collision cell they collide with gas and fragment; Q3 passes only the m/z 138 product ion to the detector. A matrix ion with the same precursor mass fragments differently and is rejected by Q3. An MRM chromatogram builds below.',
        facts: [
          { label: 'Selectivity', value: 'Very high (MRM)' },
          { label: 'Gradient', value: 'Yes' },
          { label: 'Typical LOD', value: '~fg–low pg' },
        ],
      },
    ],
    chemistry: (
      <>
        <p>
          <strong>Electrospray.</strong> The capillary is held at a few kilovolts, pulling the liquid into a Taylor cone that sprays charged droplets. As
          solvent evaporates the charge crowds together until repulsion beats surface tension (the <strong>Rayleigh limit</strong>) and droplets burst —
          repeatedly — until bare ions such as <strong>[M+H]⁺</strong> or <strong>[M+Na]⁺</strong> are released.
        </p>
        <p>
          <strong>Quadrupole.</strong> Four rods carry a DC voltage plus an RF voltage. At any setting only ions of one m/z follow a stable path; the
          rest spiral outward into the rods. A <strong>single quadrupole</strong> uses one set of rods, either scanning (full spectrum) or parked on a few
          masses (selected-ion monitoring, SIM).
        </p>
        <p>
          <strong>Triple quadrupole</strong> (also called a tandem quadrupole, QqQ). Q1 selects the precursor; in q2 it collides with nitrogen or argon
          and breaks apart (collision-induced dissociation); Q3 selects one product ion. A matrix ion that happens to share the precursor mass almost
          never shares the fragment too, so background drops away — which is why triple quads dominate trace quantitation.
        </p>
        <Eq note="Example transition for caffeine. The precursor is [M+H]⁺; the product is a characteristic fragment.">MRM 195.1 → 138.1</Eq>
      </>
    ),
    watchFor: (
      <>
        Ion suppression: co-eluting matrix competes for charge in the droplet and quietly steals signal — true for single and triple quads alike. Use
        volatile buffers and, for quantitation, an isotope-labelled internal standard. Less polar analytes often ionize better by APCI or APPI.
      </>
    ),
    facts: [
      { label: 'Selectivity', value: 'By mass (m/z)' },
      { label: 'Gradient', value: 'Yes' },
      { label: 'Typical LOD', value: '~pg (SIM)' },
    ],
  },
]
