/**
 * Spring → CSS `linear()` generator.
 *
 * Converts a perceptual (duration, bounce) intent into an accurate `linear()`
 * easing by sampling a damped harmonic oscillator. Same convention Motion and
 * SwiftUI use, so one (duration, bounce) is portable across all three.
 *
 * Physics (mass = 1), corrected against Apple's own worked examples
 * (Spring(duration:0.5, bounce:0.3) → stiffness 157.9, damping 17.6):
 *   stiffness = (2π / duration)²
 *   damping   = 4π (1 − bounce) / duration        (ζ = 1 − bounce, ω₀ = 2π/duration)
 *
 * Sampling algorithm verified verbatim against okikio/spring-easing (KB §3.2).
 */

export type SpringSpec = { duration: number; bounce: number }

export type GeneratedSpring = {
  /** CSS `linear(...)` easing string approximating the spring. */
  linear: string
  /** Total settle time in ms — use as the CSS/WAAPI duration that plays `linear`. */
  durationMs: number
  /** Sampled position value (0→1 progress) at time t seconds. */
  value: (t: number) => number
  /** Derived physics, for docs/recipes. */
  physics: { stiffness: number; damping: number; mass: number; dampingRatio: number; omega0: number }
}

export function genSpring(
  { duration, bounce }: SpringSpec,
  opts: { points?: number; velocity?: number } = {},
): GeneratedSpring {
  const mass = 1
  const omega0 = (2 * Math.PI) / duration
  const stiffness = omega0 * omega0
  const dampingRatio = 1 - bounce // ζ
  const damping = (4 * Math.PI * (1 - bounce)) / duration
  const velocity = opts.velocity ?? 0

  const zeta = dampingRatio
  const wd = zeta < 1 ? omega0 * Math.sqrt(1 - zeta * zeta) : 0
  const b = zeta < 1 ? (zeta * omega0 + -velocity) / wd : -velocity + omega0

  // position offset from target, 1 at t=0 → 0 at settle; progress = 1 − offset
  const value = (t: number): number => {
    let p: number
    if (zeta < 1) {
      p = Math.exp(-t * zeta * omega0) * (Math.cos(wd * t) + b * Math.sin(wd * t))
    } else {
      p = (1 + b * t) * Math.exp(-t * omega0)
    }
    return 1 - p
  }

  // Perceptual settle: hold within 0.5% of target for 8 steps. The strict 0.1%
  // threshold (KB §3.2) yields a long sub-pixel tail that reads as sluggish; 0.5%
  // is visually settled (≈1.6px on a 320px travel) and makes durationMs perceptual.
  const dt = 1 / 120
  let t = 0
  let rest = 0
  let settle = duration * 3
  for (let i = 0; i < 4000; i++) {
    t += dt
    if (Math.abs(1 - value(t)) < 0.005) {
      rest++
      if (rest >= 8) {
        settle = t
        break
      }
    } else {
      rest = 0
    }
    if (t > 8) {
      settle = t
      break
    }
  }

  const points = opts.points ?? 64
  const stops: number[] = []
  for (let i = 0; i < points; i++) {
    stops.push(value((i / (points - 1)) * settle))
  }
  stops[0] = 0
  stops[stops.length - 1] = 1
  const linear = `linear(${stops.map((n) => n.toFixed(4)).join(', ')})`

  return {
    linear,
    durationMs: Math.round(settle * 1000),
    value,
    physics: { stiffness, damping, mass, dampingRatio, omega0 },
  }
}
