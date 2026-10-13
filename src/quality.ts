export type QualityLevel = 'high' | 'low'
export interface Quality {
  level: QualityLevel
  dpr: [number, number]
}

/**
 * Phones, small screens and modest hardware get the lighter hero scene.
 * Override for testing with ?quality=low or ?quality=high.
 */
export function detectQuality(): Quality {
  const forced = new URLSearchParams(location.search).get('quality')
  const nav = navigator as Navigator & { deviceMemory?: number }
  const small = matchMedia('(max-width: 900px)').matches
  const coarse = matchMedia('(pointer: coarse)').matches
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4
  const level: QualityLevel = forced === 'low' || forced === 'high' ? forced : small || coarse || weak ? 'low' : 'high'
  return { level, dpr: level === 'high' ? [1, 2] : [1, 1.5] }
}

/** False when WebGL is unavailable, or forced off with ?static=1. */
export function hasWebGL(): boolean {
  if (new URLSearchParams(location.search).get('static') === '1') return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
