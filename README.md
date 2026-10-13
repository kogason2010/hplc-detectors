# Inside the HPLC Detector

An interactive guide to the chemistry behind five HPLC detectors: UV (PDA / DAD), fluorescence, refractive index, ELSD and mass spectrometry.

**Stack:** Vite · React 19 · TypeScript · Three.js via React Three Fiber (opening scene) · 2D canvas (detector schematics) · GSAP ScrollTrigger · Lenis (smooth scrolling)

## Run it

```bash
npm install
npm run dev            # local dev server at http://localhost:5173
npm run build          # production build → dist/ (host this)
npm run build:single   # one self-contained HTML → dist-single/index.html (review / offline)
```

## Publish on GitHub Pages

`.github/workflows/deploy.yml` builds the site and publishes it on every push to `main`. One-time setup in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site then appears at `https://<user>.github.io/<repo>/`. Asset paths are relative (`base: './'` in `vite.config.ts`), so any repository name works.

## What's on the page

1. **Opening (`src/hero/`).** A cloud of ~9,000 points is a mixed sample of four compounds. Scrolling separates it into coloured bands, then each band fills its own chromatogram peak. `SampleField.tsx` stores three precomputed layouts per point and blends between them in a vertex shader, so the CPU only updates two values per frame. GSAP ScrollTrigger drives the progress and the captions in `Hero.tsx`.
2. **Detector explorer (`src/detectors/`).** One tab per detector. Each tab has an animated technical schematic, a live output trace, and the chemistry explained beside it.
3. **Comparison (`src/components/Compare.tsx`).** A side-by-side table plus a "which detector should I use" guide.

## The schematics

Each detector is a small simulation in `src/detectors/draw/`, drawn on a 2D canvas:

| File | What it shows |
| --- | --- |
| `uv.ts` | UV / PDA / DAD: D₂/W lamp → flow cell → grating → 153-diode array covering 190–800 nm (≈4 nm per diode). Diodes dim by Beer–Lambert where the analyte absorbs (bands near 207 and 273 nm). Hover (or tap) the array for a loupe showing 11 enlarged diodes with wavelength, colour band, transmittance and absorbance. Colours come from `spectrum.ts`: true spectral colours for 380–750 nm, and hatched false colour for the invisible UV and near-IR |
| `fluorescence.ts` | Excitation beam through a cuvette; excited molecules emit in every direction; a PMT at 90° counts what passes the emission filter; Stokes-shift inset |
| `ri.ts` | Laser through a diagonally split cell; the exit beam tilts with Δn and moves between photodiode halves A and B |
| `elsd.ts` | Nebulizer → heated drift tube (solvent shells shrink away) → dried particles scatter a laser onto a photodiode |
| `ms.ts` | Two views behind a Single quad / Triple quad switch. **Single quadrupole:** ESI → cone → one set of rods scanning m/z → detector, with a full-scan spectrum building below. **Triple quadrupole:** Q1 passes precursor m/z 195 → collision cell fragments it → Q3 passes product m/z 138, with an MRM chromatogram below; a matrix ion with the same precursor mass fragments differently and is rejected by Q3 |

Shared pieces live in `kit.ts`: the grid, beams, labels, wavelength-to-colour mapping, and the output trace. `elution()` sends a peak through every detector on a loop. Each schematic is drawn in a 1000-unit-wide logical space. Line widths and label sizes are set in CSS pixels, so text stays readable at any size. Below 640 px wide the canvas switches to a taller layout with shorter labels.

To add a detector: write a `create…()` function in `draw/` that returns `{ step, draw }`, then add an entry to `src/detectors/detectors.tsx`. To give a detector alternative views (like single and triple quad), add a `variants` array to its entry; each variant overrides the fields it sets.

## Performance and fallbacks

- Smooth, inertial scrolling with Lenis, driven by the GSAP ticker so the scroll position, ScrollTrigger and both kinds of animation update on the same frame (`src/smoothScroll.ts`).
- The opening scene stops rendering once it's scrolled out of view.
- Schematics pause when scrolled off screen, and only the active tab's canvas exists at any time. The background grid is drawn once per size and reused, and glows use pre-rendered sprites and stacked strokes instead of canvas `shadowBlur`, which is very slow.
- Phones and slower devices get a lighter opening scene (3,600 points, lower pixel ratio). Force a tier with `?quality=low` or `?quality=high`.
- Without WebGL, the opening shows a static SVG chromatogram, and the schematics still work because they're plain 2D canvas. Preview this with `?static=1`.
- `prefers-reduced-motion` turns off smooth scrolling and the reveal transitions, and slows every animation.
- Tabs work with the keyboard (arrow keys, Home, End), and every schematic has a text description for screen readers.

## Notes

Terminology is vendor-neutral (e.g. PDA / DAD, RFU, triple quadrupole / QqQ). Schematics are simplified and not to scale, and the mass spec animation is slowed down so ion paths can be followed. Beam deflection in the RI view is exaggerated. Detection limits in the comparison table are order-of-magnitude, on-column figures. Electrochemical detection and charged aerosol detection (CAD) are left out for now.
