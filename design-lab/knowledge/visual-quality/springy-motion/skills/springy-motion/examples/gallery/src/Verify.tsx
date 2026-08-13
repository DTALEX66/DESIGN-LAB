import { Filmstrip } from './Filmstrip'
import { PRESET_LIST } from './springs'

// Deterministic verification: real generated spring curves frozen across time.
export function Verify() {
  return (
    <div>
      <p className="lede">
        Each row freezes a spring across time (seeked WAAPI frames). Read overshoot &amp; settle in one still —
        no frame-timing flakiness. This is how the presets were tuned.
      </p>

      <h3 className="group">Translate — trail · bunching = deceleration · past the line = overshoot</h3>
      {PRESET_LIST.map((p) => (
        <Filmstrip
          key={p.name}
          mode="trail"
          label={`${p.name} — ${p.feel}  ·  dur ${p.duration}s / bounce ${p.bounce}`}
          durationMs={p.durationMs}
          easing={p.linear}
        />
      ))}

      <h3 className="group">Scale — pop · peak above final = overshoot</h3>
      {PRESET_LIST.map((p) => (
        <Filmstrip
          key={p.name}
          mode="cells"
          label={`${p.name} — ${p.feel}`}
          durationMs={p.durationMs}
          easing={p.linear}
        />
      ))}
    </div>
  )
}
