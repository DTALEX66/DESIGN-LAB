import { useLayoutEffect, useRef } from 'react'

/**
 * Deterministic motion verification.
 *
 * Renders N copies of a mover element, each driven by the SAME WAAPI animation
 * but paused and seeked to a different point in time. A single static screenshot
 * therefore reveals the entire motion curve — overshoot, settle, timing — with no
 * frame-timing flakiness. This is how we *see* a spring in a still image.
 *
 * - `cells` mode: one frame per cell, left→right. Best for scale / opacity.
 * - `trail` mode: one shared track, ghosted by recency. Best for translate —
 *   bunching shows deceleration; movers past the target line show overshoot.
 */
export type FilmstripProps = {
  label: string
  durationMs: number
  /** A CSS easing string: a `linear(...)` spring approximation or a cubic-bezier. */
  easing: string
  frames?: number
  mode?: 'cells' | 'trail'
  /** WAAPI keyframes. Defaults depend on mode. */
  keyframes?: Keyframe[]
  /** Pixel size of each cell (cells mode) or track height (trail mode). */
  cell?: number
  /** Travel distance for the default trail keyframes. */
  travel?: number
}

export function Filmstrip({
  label,
  durationMs,
  easing,
  frames = 13,
  mode = 'cells',
  keyframes,
  cell = 56,
  travel = 320,
}: FilmstripProps) {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  const kf: Keyframe[] =
    keyframes ??
    (mode === 'trail'
      ? [{ transform: 'translateX(0px)' }, { transform: `translateX(${travel}px)` }]
      : [{ transform: 'scale(0.2)' }, { transform: 'scale(1)' }])

  useLayoutEffect(() => {
    refs.current.forEach((el, i) => {
      if (!el) return
      el.getAnimations().forEach((a) => a.cancel())
      const anim = el.animate(kf, { duration: durationMs, easing, fill: 'both' })
      anim.pause()
      anim.currentTime = (i / (frames - 1)) * durationMs
    })
  }, [durationMs, easing, frames, kf])

  return (
    <div className="strip">
      <div className="strip-meta">
        <span className="strip-label">{label}</span>
        <span className="strip-sub">
          {durationMs}ms · {frames}f
        </span>
      </div>

      {mode === 'cells' ? (
        <div className="strip-row">
          {Array.from({ length: frames }).map((_, i) => (
            <div className="strip-cell" style={{ width: cell, height: cell }} key={i}>
              <div className="strip-mover" ref={(el) => void (refs.current[i] = el)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="strip-track" style={{ height: cell }}>
          {/* target line at the resting position */}
          <div className="strip-target" style={{ left: travel + 10 }} />
          {Array.from({ length: frames }).map((_, i) => (
            <div
              className="strip-ghost"
              key={i}
              style={{ opacity: 0.18 + 0.82 * (i / (frames - 1)) }}
              ref={(el) => void (refs.current[i] = el)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
