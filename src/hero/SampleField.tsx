import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { ANALYTES, hero } from './heroState'

function gauss() {
  let u = 0
  let v = 0
  while (!u) u = Math.random()
  while (!v) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const BASE_Y = -1.6

/*
 * All per-point animation runs in the vertex shader, so the CPU only updates
 * two uniforms per frame no matter how many points there are.
 *
 * Every point belongs to one of four compounds and has three precomputed positions:
 *   aA — the mixed sample: one gently drifting cloud, all white
 *   aB — separation: four coloured bands along the retention axis
 *   aC — signal: each band fills its own Gaussian peak above a baseline
 * uP (scroll progress) blends A → B → C, staggered along x so it reads as a sweep.
 */
const vertex = /* glsl */ `
  uniform float uP;
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  attribute vec3 aA;
  attribute vec3 aB;
  attribute vec3 aC;
  attribute vec3 aColor;
  attribute float aSeed;
  varying vec3 vColor;

  void main() {
    float sweep = (aB.x + 4.5) / 9.0;
    float ab = smoothstep(0.24 + sweep * 0.10, 0.50 + sweep * 0.10, uP);
    float bc = smoothstep(0.64 + sweep * 0.08, 0.86 + sweep * 0.08, uP);
    float wob = (1.0 - bc) * 0.06;
    vec3 a = aA + vec3(sin(uTime * 0.5 + aSeed) * 0.08, cos(uTime * 0.45 + aSeed * 1.3) * 0.08, 0.0);
    vec3 b = aB + vec3(sin(uTime * 0.8 + aSeed) * wob, cos(uTime * 0.9 + aSeed) * wob, 0.0);
    vec3 pos = mix(mix(a, b, ab), aC, bc);

    vColor = mix(vec3(0.875, 0.898, 0.94), aColor, ab) * (0.55 + 0.45 * max(ab, 0.35));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const fragment = /* glsl */ `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    // soft Gaussian sprite with a bright core
    float a = exp(-d * d * 12.0) + 0.6 * exp(-d * d * 60.0);
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor * a, min(a, 1.0));
  }
`

function Field({ count }: { count: number }) {
  const { size, viewport } = useThree()
  const group = useRef<THREE.Group>(null)

  const geo = useMemo(() => {
    const A = new Float32Array(count * 3)
    const B = new Float32Array(count * 3)
    const Cc = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const colors = ANALYTES.map((a) => new THREE.Color(a.color))
    for (let i = 0; i < count; i++) {
      const k = i % ANALYTES.length
      const an = ANALYTES[k]
      seed[i] = Math.random() * 100
      const r = Math.cbrt(Math.random()) * 1.9
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      A[i * 3] = r * Math.sin(ph) * Math.cos(th) * 1.25
      A[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
      A[i * 3 + 2] = r * Math.cos(ph)
      const gx = gauss()
      B[i * 3] = an.rt + gx * an.w * 1.4
      B[i * 3 + 1] = gauss() * 0.16
      B[i * 3 + 2] = gauss() * 0.35
      Cc[i * 3] = an.rt + gx * an.w
      Cc[i * 3 + 1] = BASE_Y + Math.pow(Math.random(), 0.75) * an.h * Math.exp(-(gx * gx) / 2)
      Cc[i * 3 + 2] = gauss() * 0.04
      col[i * 3] = colors[k].r
      col[i * 3 + 1] = colors[k].g
      col[i * 3 + 2] = colors[k].b
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(A, 3)) // used for bounds only
    g.setAttribute('aA', new THREE.BufferAttribute(A, 3))
    g.setAttribute('aB', new THREE.BufferAttribute(B, 3))
    g.setAttribute('aC', new THREE.BufferAttribute(Cc, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uSize: { value: 0.07 }, uScale: { value: 400 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  const axisLine = useMemo(
    () =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4.6, BASE_Y, 0), new THREE.Vector3(4.6, BASE_Y, 0)]),
        new THREE.LineBasicMaterial({ color: '#9aa6bc', transparent: true, opacity: 0 }),
      ),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const p = hero.p
    material.uniforms.uP.value = p
    material.uniforms.uTime.value = t
    // match three's size attenuation: half the drawing-buffer height
    material.uniforms.uScale.value = (size.height * viewport.dpr) / 2

    // framing: cloud sits right of the text on wide screens, then the chromatogram centres
    const wide = size.width > 900
    const aspect = size.width / size.height
    const fit = Math.min(1, (aspect * 7.6) / 10.2)
    const g = group.current
    if (g) {
      const settle = smooth(0.22, 0.55, p)
      const x0 = wide ? 2.6 : 0
      const y0 = wide ? 0.1 : 2.55
      g.position.x = x0 * (1 - settle)
      g.position.y = y0 * (1 - settle) + (wide ? 0.15 : 0.6) * settle
      g.scale.setScalar(wide ? 1 : fit)
      g.rotation.y = (1 - settle) * (t * 0.08) + hero.pointerX * 0.25 * (1 - settle)
      g.rotation.x = hero.pointerY * 0.12 * (1 - settle)
    }
    ;(axisLine.material as THREE.LineBasicMaterial).opacity = smooth(0.62, 0.86, p) * 0.5
  })

  return (
    <group ref={group}>
      <points geometry={geo} material={material} frustumCulled={false} />
      <primitive object={axisLine} />
    </group>
  )
}

/** Renders only while the hero is on screen; once you scroll past it the GPU is left alone. */
export default function SampleField({ count, dpr, target }: { count: number; dpr: [number, number]; target: React.RefObject<HTMLElement | null> }) {
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    const el = target.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [target])

  return (
    <Canvas
      className="hero-gl"
      dpr={dpr}
      frameloop={onScreen ? 'always' : 'never'}
      camera={{ fov: 40, position: [0, 0.2, 11] }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
    >
      <Field count={count} />
    </Canvas>
  )
}
