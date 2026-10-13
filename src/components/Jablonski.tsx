/** Simplified Jablonski diagram: absorption, vibrational relaxation, fluorescence. */
export function Jablonski() {
  const mono = { fontFamily: 'IBM Plex Mono, monospace' }
  return (
    <svg className="jab" viewBox="0 0 460 170" role="img" aria-label="Jablonski diagram: absorption to S1, vibrational relaxation as heat, then emission at a longer wavelength">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="context-stroke" />
        </marker>
      </defs>
      <g stroke="#7a8496" strokeWidth="1.6">
        <line x1="40" y1="150" x2="420" y2="150" />
        <line x1="40" y1="40" x2="420" y2="40" />
      </g>
      <g stroke="#3a4252" strokeWidth="1">
        <line x1="40" y1="138" x2="420" y2="138" />
        <line x1="40" y1="127" x2="420" y2="127" />
        <line x1="40" y1="28" x2="420" y2="28" />
        <line x1="40" y1="17" x2="420" y2="17" />
      </g>
      <text x="8" y="154" fill="#e8ecff" fontSize="13" style={mono}>S₀</text>
      <text x="8" y="44" fill="#e8ecff" fontSize="13" style={mono}>S₁</text>
      <line x1="110" y1="150" x2="110" y2="19" stroke="#9b7dff" strokeWidth="3" markerEnd="url(#ah)" />
      <text x="58" y="98" fill="#b4a3ff" fontSize="11" style={mono}>absorb</text>
      <path d="M130 19 q8 4 0 8 q-8 4 0 8 q8 4 2 6" stroke="#ff8a5c" strokeWidth="2" fill="none" markerEnd="url(#ah)" />
      <text x="146" y="30" fill="#ff9c82" fontSize="11" style={mono}>heat (ps)</text>
      <line x1="300" y1="40" x2="300" y2="136" stroke="#3fe0a0" strokeWidth="3" markerEnd="url(#ah)" />
      <text x="312" y="98" fill="#3fe0a0" fontSize="11" style={mono}>emit (ns), longer λ</text>
    </svg>
  )
}
