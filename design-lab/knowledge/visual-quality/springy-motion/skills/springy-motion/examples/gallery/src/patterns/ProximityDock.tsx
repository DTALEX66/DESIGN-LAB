import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react'
import type { MotionValue } from 'motion/react'

/**
 * Proximity dock — magnify by cursor DISTANCE (not binary hover).
 *
 * The surface scales up ONCE on hover-enter (a state change), then holds. Inside it,
 * each tile scales by proximity AND is pushed apart by the cumulative growth of the
 * tiles between it and the cursor, so the magnified icons never overlap — while the
 * layout boxes stay fixed, so the tray never reflows/jiggles per cursor-move.
 */
const BASE = 52
const GAP = 10
const PITCH = BASE + GAP
const MAX = 1.6
const FALLOFF = 150
const PADX = 13

const TILES = [
  { key: 'home', label: 'Home', face: 'linear-gradient(150deg,#3b82f6,#2563eb)', glyph: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1v-7.5Z" fill="#fff" /> },
  { key: 'mail', label: 'Mail', face: 'linear-gradient(150deg,#22d3ee,#0ea5e9)', glyph: <g fill="none" stroke="#fff" strokeWidth="1.8"><rect x="3.5" y="6" width="17" height="12" rx="2.6" /><path d="m4.5 8 7.5 5 7.5-5" strokeLinecap="round" strokeLinejoin="round" /></g> },
  { key: 'cal', label: 'Calendar', face: 'linear-gradient(150deg,#fb7185,#e11d48)', glyph: <g fill="#fff"><rect x="4" y="5.5" width="16" height="14.5" rx="3" opacity=".35" /><rect x="4" y="5.5" width="16" height="4.6" rx="3" /><circle cx="9" cy="14" r="1.1" /><circle cx="12" cy="14" r="1.1" /><circle cx="15" cy="14" r="1.1" /></g> },
  { key: 'photos', label: 'Photos', face: 'linear-gradient(150deg,#a78bfa,#7c3aed)', glyph: <g fill="none" stroke="#fff" strokeWidth="1.8"><rect x="4" y="5.5" width="16" height="13" rx="2.6" /><circle cx="9" cy="10" r="1.6" fill="#fff" stroke="none" /><path d="m5 17 4.5-4 3 2.5L16 11l3 3" strokeLinecap="round" strokeLinejoin="round" /></g> },
  { key: 'music', label: 'Music', face: 'linear-gradient(150deg,#fb923c,#f43f5e)', glyph: <g fill="#fff"><path d="M10 7.5 17 6v9.5a2.6 2.6 0 1 1-1.6-2.4V8.2L11.6 9v7.6A2.6 2.6 0 1 1 10 14.2V7.5Z" /></g> },
  { key: 'settings', label: 'Settings', face: 'linear-gradient(150deg,#cbd5e1,#94a3b8)', glyph: <g fill="none" stroke="#fff" strokeWidth="1.8"><circle cx="12" cy="12" r="2.7" /><path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6" strokeLinecap="round" /></g> },
]
const COUNT = TILES.length

const scaleAt = (cp: number, i: number) =>
  1 + Math.max(0, 1 - Math.abs(i * PITCH + BASE / 2 - cp) / FALLOFF) * (MAX - 1)

function Tile({ mouseX, contentLeft, index, tile }: {
  mouseX: MotionValue<number>; contentLeft: number; index: number; tile: (typeof TILES)[number]
}) {
  const cfg = { stiffness: 380, damping: 28, mass: 0.6 }

  const scale = useSpring(useTransform(mouseX, (mx) => (Number.isFinite(mx) ? scaleAt(mx - contentLeft, index) : 1)), cfg)

  const x = useSpring(useTransform(mouseX, (mx) => {
    if (!Number.isFinite(mx)) return 0
    const cp = mx - contentLeft
    const w = (i: number) => BASE * scaleAt(cp, i)
    const left: number[] = []
    let e = 0
    for (let i = 0; i < COUNT; i++) { left[i] = e; e += w(i) + GAP }
    const k = Math.min(COUNT - 1, Math.max(0, Math.floor(cp / PITCH)))
    const frac = Math.min(1, Math.max(0, (cp - k * PITCH) / BASE))
    const shift = cp - (left[k] + frac * w(k))
    return left[index] + w(index) / 2 + shift - (index * PITCH + BASE / 2)
  }), cfg)

  const y = useTransform(scale, [1, MAX], [0, -6])
  const opacity = useTransform(scale, [1, 1.12, MAX], [0.7, 0.85, 1])
  const labelOpacity = useTransform(scale, [1 + (MAX - 1) * 0.5, MAX], [0, 1])
  const labelScale = useTransform(scale, (s) => 1 / s)

  return (
    <motion.button type="button" className="pd-tile" style={{ scale, x, y, opacity, transformOrigin: 'bottom center' }} aria-label={tile.label}>
      <motion.span className="pd-label" style={{ opacity: labelOpacity, scale: labelScale }} aria-hidden>{tile.label}</motion.span>
      <span className="pd-face" style={{ background: tile.face }}>
        <svg width="60%" height="60%" viewBox="0 0 24 24">{tile.glyph}</svg>
      </span>
    </motion.button>
  )
}

export function ProximityDock() {
  const reduce = useReducedMotion()
  const mouseX = useMotionValue(Infinity)
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [contentLeft, setContentLeft] = useState(0)

  useLayoutEffect(() => {
    const measure = () => { if (ref.current) setContentLeft(ref.current.getBoundingClientRect().x + PADX) }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <>
      <style>{`
        .pd-wrap{ width:100%; display:flex; flex-direction:column; align-items:center; gap:40px;
          padding-top:34px; font-family:ui-sans-serif,system-ui,sans-serif; }
        .pd-dock{ display:flex; align-items:flex-end; gap:${GAP}px; padding:9px ${PADX}px; overflow:visible;
          transform-origin:bottom center; will-change:transform;
          background:rgba(244,244,245,.72); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(228,228,231,.9); border-radius:22px;
          box-shadow:0 1px 2px rgba(24,24,27,.05), 0 18px 40px -20px rgba(24,24,27,.35); }
        .pd-tile{ appearance:none; border:0; background:transparent; padding:0; cursor:pointer;
          position:relative; flex:0 0 auto; width:${BASE}px; height:${BASE}px; will-change:transform;
          -webkit-tap-highlight-color:transparent; }
        .pd-face{ position:absolute; inset:0; border-radius:26%; display:grid; place-items:center;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.4), inset 0 0 0 .5px rgba(0,0,0,.05),
            0 4px 10px -4px rgba(24,24,27,.3); }
        .pd-label{ position:absolute; bottom:calc(100% + 9px); left:50%; transform-origin:bottom center;
          translate:-50% 0; background:#18181b; color:#fff; font-size:12px; font-weight:560; letter-spacing:-.01em;
          padding:4px 9px; border-radius:7px; white-space:nowrap; pointer-events:none; }
        .pd-label::after{ content:""; position:absolute; top:100%; left:50%; transform:translateX(-50%);
          border:4px solid transparent; border-top-color:#18181b; }
        .pd-hint{ font-size:12px; color:#71717a; letter-spacing:-.005em; }
      `}</style>

      <div className="pd-wrap">
        <motion.div
          className="pd-dock"
          ref={ref}
          animate={reduce ? undefined : { scale: active ? 1.06 : 1 }}
          transition={{ type: 'spring', visualDuration: 0.32, bounce: 0.22 }}
          onPointerEnter={() => { if (!reduce) setActive(true) }}
          onPointerMove={(e) => { if (!reduce) mouseX.set(e.clientX) }}
          onPointerLeave={() => { setActive(false); mouseX.set(Infinity) }}
        >
          {TILES.map((t, i) => (
            <Tile key={t.key} mouseX={mouseX} contentLeft={contentLeft} index={i} tile={t} />
          ))}
        </motion.div>
        <div className="pd-hint">Hover the dock — it lifts once, then tiles magnify by distance (no overlap)</div>
      </div>
    </>
  )
}
