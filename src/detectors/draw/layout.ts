import { px, type Frame } from './kit'

/** Where the main optical axis sits and where the output trace goes. */
export function layout(f: Frame) {
  if (f.compact) {
    const th = px(f, 64)
    return {
      cy: f.H * 0.36,
      trace: { x: px(f, 14), y: f.H - th - px(f, 52), w: f.W - px(f, 28), h: th },
    }
  }
  const tw = px(f, 210)
  const th = px(f, 74)
  return {
    cy: f.H * 0.43,
    trace: { x: f.W - tw - px(f, 16), y: f.H - th - px(f, 16), w: tw, h: th },
  }
}
