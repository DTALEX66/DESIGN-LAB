import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react'
import type { MotionValue } from 'motion/react'

/**
 * Proximity vs Direct scaling — the teaching comparison (recreated from a reference).
 *
 *   Using Proximity: every tile scales + darkens by the cursor's DISTANCE (a smooth
 *                    gradient — neighbors respond too). Organic.
 *   Direct Scaling : only the tile under the cursor scales; neighbors stay flat. Binary.
 *
 * LESSON: scaling a tile in place makes it OVERLAP its neighbors. To magnify a row
 * without overlap AND without resizing the surface, each tile gets `scale` (transform)
 * + an `x` PUSH equal to the cumulative growth of the tiles between it and the cursor
 * (lay the scaled widths out, anchor at the cursor, express as offsets). Layout boxes
 * never move → the tray is static; tiles fan apart → no overlap.
 */
const BASE = 44
const GAP = 9
const PITCH = BASE + GAP
const MAX = 1.5
const FALLOFF = 118
const COUNT = 5
const PADX = 22

type Mode = 'proximity' | 'direct'

function scaleAt(cp: number, i: number, mode: Mode): number {
  const d = i * PITCH + BASE / 2 - cp // distance from cursor to tile i's BASE center
  if (mode === 'direct') return Math.abs(d) <= PITCH / 2 ? MAX : 1
  return 1 + Math.max(0, 1 - Math.abs(d) / FALLOFF) * (MAX - 1)
}

function Tile({ mouseX, contentLeft, index, mode, slow }: {
  mouseX: MotionValue<number>; contentLeft: number; index: number; mode: Mode; slow: boolean
}) {
  const cfg = slow ? { stiffness: 90, damping: 18, mass: 1 } : { stiffness: 420, damping: 30, mass: 0.7 }

  const scaleMV = useTransform(mouseX, (mx) => (Number.isFinite(mx) ? scaleAt(mx - contentLeft, index, mode) : 1))
  const scale = useSpring(scaleMV, cfg)

  // x = (ideal center from a scaled-width layout, anchored at the cursor) − (base center)
  const xMV = useTransform(mouseX, (mx) => {
    if (!Number.isFinite(mx)) return 0
    const cp = mx - contentLeft
    const w = (i: number) => BASE * scaleAt(cp, i, mode)
    const left: number[] = []
    let e = 0
    for (let i = 0; i < COUNT; i++) { left[i] = e; e += w(i) + GAP }
    const idealCenter = (i: number) => left[i] + w(i) / 2
    const baseCenter = (i: number) => i * PITCH + BASE / 2
    // keep the point under the cursor fixed
    const k = Math.min(COUNT - 1, Math.max(0, Math.floor(cp / PITCH)))
    const frac = Math.min(1, Math.max(0, (cp - k * PITCH) / BASE))
    const shift = cp - (left[k] + frac * w(k))
    return idealCenter(index) + shift - baseCenter(index)
  })
  const x = useSpring(xMV, cfg)

  const y = useTransform(scale, [1, MAX], [0, -5])
  const background = useTransform(scale, [1, MAX], ['#e6e6e9', '#a7a7af']) // darken nearer

  return <motion.div className="pc-tile" style={{ scale, x, y, background, transformOrigin: 'bottom center' }} />
}

function Dock({ label, mode, mouseX, slow }: { label: string; mode: Mode; mouseX: MotionValue<number>; slow: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [contentLeft, setContentLeft] = useState(0)
  useLayoutEffect(() => {
    const measure = () => { if (ref.current) setContentLeft(ref.current.getBoundingClientRect().x + PADX) }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <div className="pc-col">
      <div className="pc-dock" ref={ref}>
        {Array.from({ length: COUNT }).map((_, i) => (
          <Tile key={i} mouseX={mouseX} contentLeft={contentLeft} index={i} mode={mode} slow={slow} />
        ))}
      </div>
      <div className="pc-label">{label}</div>
    </div>
  )
}

export function ProximityCompare() {
  const reduce = useReducedMotion()
  const mouseX = useMotionValue(Infinity)
  const [slow, setSlow] = useState(false)

  return (
    <>
      <style>{`
        .pc-wrap{ width:100%; display:flex; flex-direction:column; align-items:center; gap:18px;
          padding-top:18px; font-family:ui-sans-serif,system-ui,sans-serif; }
        .pc-col{ display:flex; flex-direction:column; align-items:center; gap:9px; }
        /* flex row of FIXED-width tiles → the tray sizes to the base row and is STATIC.
           tiles transform (scale + x) on top; overflow:visible lets them fan out/up. */
        .pc-dock{ display:flex; align-items:flex-end; gap:${GAP}px; padding:10px ${PADX}px; overflow:visible;
          background:#fff; border-radius:20px;
          box-shadow:0 1px 1px rgba(24,24,27,.04), 0 10px 22px -12px rgba(24,24,27,.22),
            inset 0 0 0 1px rgba(24,24,27,.03); }
        .pc-tile{ flex:0 0 auto; width:${BASE}px; height:${BASE}px; border-radius:13px; will-change:transform; }
        .pc-label{ font-size:14px; font-weight:650; letter-spacing:-.01em; color:#52525b; }
        .pc-slow{ appearance:none; cursor:pointer; font:inherit; font-size:13px; font-weight:600; letter-spacing:-.01em;
          padding:8px 16px; border-radius:11px; border:1px solid #e7e7ea; background:#f4f4f5; color:#18181b;
          box-shadow:0 1px 2px rgba(24,24,27,.05); margin-top:2px; transition:background-color .15s ease; }
        .pc-slow.on{ background:#18181b; color:#fff; border-color:#18181b; }
      `}</style>

      <div
        className="pc-wrap"
        onPointerMove={(e) => { if (!reduce) mouseX.set(e.clientX) }}
        onPointerLeave={() => mouseX.set(Infinity)}
      >
        <Dock label="Using Proximity" mode="proximity" mouseX={mouseX} slow={slow} />
        <Dock label="Direct Scaling" mode="direct" mouseX={mouseX} slow={slow} />
        <motion.button
          type="button"
          className={'pc-slow' + (slow ? ' on' : '')}
          onClick={() => setSlow((s) => !s)}
          whileTap={reduce ? undefined : { scale: 0.96 }}
        >
          Slow Motion
        </motion.button>
      </div>
    </>
  )
}
