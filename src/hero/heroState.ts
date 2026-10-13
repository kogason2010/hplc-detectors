/** Scroll progress through the hero (0 → 1), written by GSAP and read by the 3D field each frame. */
export const hero = { p: 0, pointerX: 0, pointerY: 0 }

/** The four compounds in the example sample. Retention positions are in world units along x. */
export const ANALYTES = [
  { color: '#8f7dff', rt: -3.5, h: 2.1, w: 0.26, label: '1.8 min' },
  { color: '#3fe0a0', rt: -1.25, h: 2.9, w: 0.3, label: '2.7 min' },
  { color: '#5cc8ff', rt: 0.95, h: 1.5, w: 0.34, label: '3.8 min' },
  { color: '#ff8a5c', rt: 3.25, h: 2.4, w: 0.42, label: '5.3 min' },
]
