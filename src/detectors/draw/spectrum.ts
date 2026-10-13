/**
 * Wavelength → display colour for the photodiode array.
 *
 * Visible light (380–750 nm) uses the standard piecewise approximation of the
 * spectral locus (after Dan Bruton), with intensity roll-off toward the edges
 * of human vision and display gamma. UV and near-IR are invisible, so they are
 * drawn in a muted false colour and labelled as such — never as bright magenta.
 */

export const VIS_MIN = 380
export const VIS_MAX = 750

/** Linear-ish RGB (0–1) for a visible wavelength, including edge-of-vision dimming. */
function visibleRGB(nm: number): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  if (nm < 440) {
    r = -(nm - 440) / (440 - 380)
    b = 1
  } else if (nm < 490) {
    g = (nm - 440) / (490 - 440)
    b = 1
  } else if (nm < 510) {
    g = 1
    b = -(nm - 510) / (510 - 490)
  } else if (nm < 580) {
    r = (nm - 510) / (580 - 510)
    g = 1
  } else if (nm < 645) {
    r = 1
    g = -(nm - 645) / (645 - 580)
  } else {
    r = 1
  }
  // the eye's sensitivity falls off at both ends of the visible range
  let k = 1
  if (nm < 420) k = 0.3 + (0.7 * (nm - 380)) / 40
  else if (nm > 700) k = 0.3 + (0.7 * (VIS_MAX + 30 - nm)) / 80
  const gamma = (v: number) => (v <= 0 ? 0 : Math.pow(v * k, 0.8))
  return [gamma(r), gamma(g), gamma(b)]
}

const UV_FALSE: [number, number, number] = [0.42, 0.38, 0.6] // muted grey-violet
const NIR_FALSE: [number, number, number] = [0.5, 0.26, 0.26] // muted brick

export function isVisible(nm: number) {
  return nm >= VIS_MIN && nm <= VIS_MAX
}

/** Base colour (0–1 RGB) for a wavelength at full intensity. */
export function spectralRGB(nm: number): [number, number, number] {
  if (nm < VIS_MIN) return UV_FALSE
  if (nm > VIS_MAX) return NIR_FALSE
  return visibleRGB(nm)
}

/** CSS colour for a diode at the given relative intensity (0 = dark, 1 = full lamp light). */
export function pixelCss(nm: number, intensity: number) {
  const [r, g, b] = spectralRGB(nm)
  const k = 0.1 + 0.9 * Math.max(0, Math.min(1, intensity))
  const to = (v: number) => Math.round(255 * v * k)
  return `rgb(${to(r)},${to(g)},${to(b)})`
}

/** Full-intensity CSS colour, for rays and labels. */
export function baseCss(nm: number) {
  return pixelCss(nm, 1)
}

export function bandName(nm: number) {
  if (nm < 280) return 'UV-C · invisible (shown in false colour)'
  if (nm < 315) return 'UV-B · invisible (shown in false colour)'
  if (nm < VIS_MIN) return 'UV-A · invisible (shown in false colour)'
  if (nm < 450) return 'violet'
  if (nm < 495) return 'blue'
  if (nm < 570) return 'green'
  if (nm < 590) return 'yellow'
  if (nm < 620) return 'orange'
  if (nm <= VIS_MAX) return 'red'
  return 'near-infrared · invisible (shown in false colour)'
}
