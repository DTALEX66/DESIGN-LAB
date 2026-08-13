import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Transition } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

type State = 'idle' | 'music' | 'timer' | 'call'
const STATES: { id: State; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'music', label: 'Music' },
  { id: 'timer', label: 'Timer' },
  { id: 'call', label: 'Call' },
]

/* Per-state pill geometry. The container animates width/height/borderRadius DIRECTLY
   (no Motion `layout` — that scale-distorts corners). The stage is top-anchored, so a
   taller height simply opens DOWNWARD. */
const SHAPE: Record<State, { w: number; h: number; r: number }> = {
  idle: { w: 132, h: 36, r: 18 },
  music: { w: 292, h: 64, r: 28 },
  timer: { w: 210, h: 64, r: 28 },
  call: { w: 292, h: 64, r: 28 },
}
const MUSIC_EXPANDED = { w: 292, h: 214, r: 34 }

const EQ_BARS = [0, 1, 2, 3]
const EQ_HEIGHTS: number[][] = [
  [7, 18, 10, 20, 8],
  [16, 8, 22, 11, 18],
  [10, 21, 9, 16, 22],
  [20, 11, 17, 8, 14],
]

export function DynamicIsland() {
  const reduce = useReducedMotion()
  const [state, setState] = useState<State>('music')
  const [expanded, setExpanded] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0.34)
  const [secs, setSecs] = useState(154)

  // leaving music always collapses the player
  useEffect(() => {
    if (state !== 'music') setExpanded(false)
  }, [state])

  // timer countdown
  useEffect(() => {
    if (state !== 'timer') return
    const t = window.setInterval(() => setSecs((s) => (s <= 0 ? 0 : s - 1)), 1000)
    return () => window.clearInterval(t)
  }, [state])

  // gentle music progress drift
  useEffect(() => {
    if (state !== 'music' || !playing) return
    const t = window.setInterval(() => setProgress((p) => (p >= 1 ? 0 : +(p + 0.0125).toFixed(4))), 450)
    return () => window.clearInterval(t)
  }, [state, playing])

  const shape = state === 'music' && expanded ? MUSIC_EXPANDED : SHAPE[state]
  const morph: Transition = reduce ? { duration: 0 } : { type: 'spring', visualDuration: 0.42, bounce: 0.16 }
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const R = 13
  const CIRC = 2 * Math.PI * R
  const dash = CIRC * (1 - secs / 154)

  const tappable = state === 'music' && !expanded

  return (
    <>
      <style>{`
        .di-wrap{ width:300px; box-sizing:border-box; font-family:ui-sans-serif,system-ui,sans-serif;
          color:#18181b; display:flex; flex-direction:column; align-items:center; padding:6px 0 2px; gap:14px;
          font-variant-numeric:tabular-nums; --di-accent:#2563eb; }
        .di-stage{ width:100%; height:232px; display:flex; align-items:flex-start; justify-content:center;
          padding-top:14px; box-sizing:border-box; }
        .di-island{ position:relative; overflow:hidden; background:#0b0b0c; color:#fff;
          box-shadow:0 1px 2px rgba(24,24,27,.18),0 18px 44px -16px rgba(11,11,12,.66),inset 0 0 0 .5px rgba(255,255,255,.07);
          will-change:width,height,border-radius; }
        .di-island.is-tappable{ cursor:pointer; }
        .di-island.is-tappable:active{ filter:brightness(1.1); }

        .di-layer{ position:absolute; inset:0; display:flex; align-items:center; }

        /* IDLE */
        .di-idle{ justify-content:center; gap:8px; padding:0 14px; }
        .di-idle-dot{ width:9px; height:9px; border-radius:999px; background:var(--di-accent); }
        .di-idle-lbl{ font-size:12px; font-weight:600; letter-spacing:-.01em; color:#a1a1aa; }

        /* shared row for the 64px states */
        .di-row{ gap:12px; padding:0 14px; width:100%; box-sizing:border-box; }
        .di-art{ flex:0 0 auto; border-radius:11px; overflow:hidden;
          background:linear-gradient(140deg,#6366f1,#ec4899 55%,#f59e0b);
          box-shadow:inset 0 0 0 .5px rgba(255,255,255,.18); position:relative; }
        .di-art::after{ content:""; position:absolute; inset:0;
          background:radial-gradient(120% 90% at 20% 12%,rgba(255,255,255,.4),transparent 55%); }
        .di-meta{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; gap:2px; }
        .di-title{ font-size:13px; font-weight:650; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .di-sub{ font-size:11px; font-weight:500; color:#a1a1aa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        /* MUSIC PLAYER — top row is anchored, controls reveal BELOW */
        .di-player{ position:absolute; inset:0; padding:12px 16px 14px; display:flex; flex-direction:column; }
        .di-prow{ display:flex; align-items:center; gap:12px; height:40px; flex:0 0 auto; }
        .di-prow-right{ position:relative; flex:0 0 auto; width:30px; height:26px; display:flex; align-items:center; justify-content:flex-end; }
        .di-eq{ position:absolute; right:0; display:flex; align-items:center; gap:3px; height:24px; }
        .di-eq span{ display:block; width:3px; border-radius:2px; background:linear-gradient(180deg,#60a5fa,var(--di-accent)); }
        .di-collapse{ position:absolute; right:0; appearance:none; border:0; cursor:pointer;
          width:26px; height:26px; border-radius:999px; background:rgba(255,255,255,.08); color:#d4d4d8; display:grid; place-items:center; }
        .di-collapse:active{ background:rgba(255,255,255,.16); }
        .di-below{ flex:1 1 auto; display:flex; flex-direction:column; justify-content:center; gap:14px; padding-top:12px; min-height:0; }

        .di-scrub{ display:flex; flex-direction:column; gap:6px; }
        .di-track{ position:relative; height:5px; border-radius:999px; background:rgba(255,255,255,.14); cursor:pointer; touch-action:none; }
        .di-fill{ position:absolute; left:0; top:0; bottom:0; border-radius:999px; background:linear-gradient(90deg,#60a5fa,var(--di-accent)); }
        .di-knob{ position:absolute; top:50%; width:13px; height:13px; border-radius:999px; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,.4); transform:translate(-50%,-50%); cursor:grab; }
        .di-knob:active{ cursor:grabbing; }
        .di-times{ display:flex; justify-content:space-between; font-size:10px; color:#a1a1aa; font-weight:500; }
        .di-transport{ display:flex; align-items:center; justify-content:center; gap:24px; }
        .di-tbtn{ appearance:none; border:0; background:transparent; cursor:pointer; color:#fff; display:grid; place-items:center; padding:4px; }
        .di-play{ width:44px; height:44px; border-radius:999px; background:#fff; color:#0b0b0c; box-shadow:0 8px 20px -8px rgba(0,0,0,.6); }
        .di-tbtn svg, .di-play svg, .di-collapse svg, .di-cbtn svg, .di-timer-ring svg{ display:block; }

        /* TIMER */
        .di-timer-ring{ flex:0 0 auto; display:grid; place-items:center; }
        .di-timer-ring svg{ transform:rotate(-90deg); }
        .di-timer-read{ flex:1 1 auto; display:flex; flex-direction:column; gap:1px; }
        .di-timer-time{ font-size:20px; font-weight:650; letter-spacing:-.02em; line-height:1; }
        .di-timer-lbl{ font-size:10px; font-weight:600; color:#a1a1aa; letter-spacing:.04em; text-transform:uppercase; }

        /* CALL */
        .di-call-meta{ flex:1 1 auto; min-width:0; }
        .di-call-name{ font-size:13px; font-weight:650; letter-spacing:-.01em; }
        .di-call-sub{ font-size:11px; font-weight:500; color:#34d399; }
        .di-call-btns{ flex:0 0 auto; display:flex; gap:8px; }
        .di-cbtn{ appearance:none; border:0; cursor:pointer; width:34px; height:34px; border-radius:999px; display:grid; place-items:center; color:#fff; }
        .di-cbtn.acc{ background:#16a34a; box-shadow:0 6px 16px -8px rgba(22,163,74,.9); }
        .di-cbtn.dec{ background:#ef4444; box-shadow:0 6px 16px -8px rgba(239,68,68,.9); }

        /* segmented control */
        .di-seg{ position:relative; display:flex; background:#fafafa; border:1px solid #e7e7ea; border-radius:12px; padding:3px; box-shadow:0 1px 2px rgba(24,24,27,.05); }
        .di-seg-btn{ position:relative; appearance:none; border:0; background:transparent; font:inherit; font-size:12px; font-weight:600; letter-spacing:-.01em; color:#71717a; padding:6px 13px; border-radius:9px; cursor:pointer; transition:color .18s ease; z-index:1; }
        .di-seg-btn.is-on{ color:#fff; }
        .di-seg-pill{ position:absolute; inset:0; z-index:0; border-radius:9px; background:var(--di-accent); box-shadow:0 2px 8px -3px rgba(37,99,235,.8); }
        .di-hint{ font-size:11px; color:#71717a; text-align:center; min-height:14px; }
        .di-hint b{ color:#18181b; font-weight:600; }
      `}</style>

      <div className="di-wrap">
        <div className="di-stage">
          <motion.div
            className={'di-island' + (tappable ? ' is-tappable' : '')}
            onClick={tappable ? () => setExpanded(true) : undefined}
            initial={false}
            animate={{ width: shape.w, height: shape.h, borderRadius: shape.r }}
            transition={morph}
            whileHover={tappable && !reduce ? { scale: 1.01, filter: 'brightness(1.06)' } : undefined}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {state === 'idle' ? (
                <CrossLayer key="idle" reduce={reduce}>
                  <div className="di-layer di-idle">
                    <span className="di-idle-dot" />
                    <span className="di-idle-lbl">Live Activity</span>
                  </div>
                </CrossLayer>
              ) : state === 'music' ? (
                /* one element for collapsed AND expanded — only the box height +
                   the reveal-below change, so nothing crossfades or repositions */
                <CrossLayer key="music" reduce={reduce}>
                  <div className="di-player">
                    <div className="di-prow">
                      <div className="di-art" style={{ width: 40, height: 40 }} />
                      <div className="di-meta">
                        <span className="di-title">Aurora Borealis</span>
                        <span className="di-sub">Submotion</span>
                      </div>
                      <div className="di-prow-right">
                        <motion.div
                          className="di-eq"
                          aria-hidden
                          animate={{ opacity: expanded ? 0 : 1 }}
                          transition={reduce ? { duration: 0 } : { duration: 0.16 }}
                        >
                          {EQ_BARS.map((b) => (
                            <motion.span
                              key={b}
                              style={{ height: 13 }}
                              animate={reduce || expanded ? { height: 13 } : { height: EQ_HEIGHTS[b] }}
                              transition={
                                reduce || expanded
                                  ? { duration: 0 }
                                  : { duration: 0.9, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: b * 0.08 }
                              }
                            />
                          ))}
                        </motion.div>
                        <motion.button
                          type="button"
                          className="di-collapse"
                          aria-label="Collapse"
                          onClick={() => setExpanded(false)}
                          animate={{ opacity: expanded ? 1 : 0 }}
                          transition={reduce ? { duration: 0 } : { duration: 0.16 }}
                          style={{ pointerEvents: expanded ? 'auto' : 'none' }}
                          whileTap={reduce ? undefined : { scale: 0.85 }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </motion.button>
                      </div>
                    </div>

                    {/* controls reveal BELOW as the box opens downward */}
                    <motion.div
                      className="di-below"
                      aria-hidden={!expanded}
                      animate={{ opacity: expanded ? 1 : 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.22, delay: expanded ? 0.07 : 0 }}
                      style={{ pointerEvents: expanded ? 'auto' : 'none' }}
                    >
                      <Scrubber reduce={reduce} progress={progress} onScrub={setProgress} />
                      <div className="di-transport">
                        <motion.button type="button" className="di-tbtn" aria-label="Previous" whileTap={reduce ? undefined : { scale: 0.8 }} transition={spring.snap}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6v12H5V6h2Zm12 .5v11l-9-5.5 9-5.5Z" /></svg>
                        </motion.button>
                        <motion.button type="button" className="di-tbtn di-play" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)} whileTap={reduce ? undefined : { scale: 0.9 }} transition={spring.pop}>
                          {/* both icons share grid cell 1/1 so they overlap-center and
                              crossfade in place (popLayout would pop the exiting icon to
                              the corner and break centering). */}
                          <AnimatePresence initial={false}>
                            {playing ? (
                              <motion.svg key="pause" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ gridArea: '1 / 1' }}
                                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }} transition={reduce ? { duration: 0.1 } : spring.snap}>
                                <rect x="6" y="5" width="4" height="14" rx="1.3" /><rect x="14" y="5" width="4" height="14" rx="1.3" />
                              </motion.svg>
                            ) : (
                              <motion.svg key="play" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ gridArea: '1 / 1' }}
                                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }} transition={reduce ? { duration: 0.1 } : spring.snap}>
                                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                              </motion.svg>
                            )}
                          </AnimatePresence>
                        </motion.button>
                        <motion.button type="button" className="di-tbtn" aria-label="Next" whileTap={reduce ? undefined : { scale: 0.8 }} transition={spring.snap}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6v12h2V6h-2ZM5 6.5v11l9-5.5L5 6.5Z" /></svg>
                        </motion.button>
                      </div>
                    </motion.div>
                  </div>
                </CrossLayer>
              ) : state === 'timer' ? (
                <CrossLayer key="timer" reduce={reduce}>
                  <div className="di-layer di-row">
                    <div className="di-timer-ring">
                      <svg width="40" height="40" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r={R} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="3.4" />
                        <motion.circle cx="16" cy="16" r={R} fill="none" stroke="var(--di-accent)" strokeWidth="3.4" strokeLinecap="round"
                          strokeDasharray={CIRC} animate={{ strokeDashoffset: dash }} transition={reduce ? { duration: 0 } : spring.track} />
                      </svg>
                    </div>
                    <div className="di-timer-read">
                      <span className="di-timer-time">{mm}:{ss}</span>
                      <span className="di-timer-lbl">Focus timer</span>
                    </div>
                  </div>
                </CrossLayer>
              ) : (
                <CrossLayer key="call" reduce={reduce}>
                  <div className="di-layer di-row">
                    <div className="di-art" style={{ width: 40, height: 40, borderRadius: 999 }} />
                    <div className="di-call-meta">
                      <div className="di-call-name">Maya Chen</div>
                      <div className="di-call-sub">mobile · incoming…</div>
                    </div>
                    <div className="di-call-btns">
                      <motion.button type="button" className="di-cbtn dec" aria-label="Decline" whileTap={reduce ? undefined : { scale: 0.85 }} transition={spring.snap}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 5.5C9 11 15 11 21 5.5l-2.2 3.4c-3.9 2.5-8.7 2.5-13.6 0L3 5.5Z" fill="currentColor" /></svg>
                      </motion.button>
                      <motion.button type="button" className="di-cbtn acc" aria-label="Accept" whileTap={reduce ? undefined : { scale: 0.85 }}
                        animate={reduce ? undefined : { rotate: [0, -12, 12, -8, 0] }}
                        transition={reduce ? spring.snap : { rotate: { duration: 1.1, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' } }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8c1.2 2.4 3.2 4.4 5.6 5.6l1.9-1.9c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1-8.3 0-15-6.7-15-15 0-.6.4-1 1-1h2.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1l-1.9 1.8Z" fill="currentColor" /></svg>
                      </motion.button>
                    </div>
                  </div>
                </CrossLayer>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="di-seg" role="tablist" aria-label="Live activity">
          {STATES.map((s) => {
            const on = state === s.id
            return (
              <button key={s.id} type="button" role="tab" aria-selected={on}
                className={'di-seg-btn' + (on ? ' is-on' : '')} onClick={() => setState(s.id)}>
                {on && (reduce ? <span className="di-seg-pill" /> : <motion.span layoutId="di-segpill" className="di-seg-pill" transition={spring.snap} />)}
                <span style={{ position: 'relative', zIndex: 1 }}>{s.label}</span>
              </button>
            )
          })}
        </div>

        <p className="di-hint">
          {tappable ? (
            <>Tap the island to <b>open the player</b></>
          ) : state === 'music' ? (
            <>It opened <b>downward</b> — tap ⌃ to close</>
          ) : (
            <>The pill <b>morphs shape</b> between activities</>
          )}
        </p>
      </div>
    </>
  )
}

/* state content crossfades quickly when SWITCHING activities (idle/music/timer/call) */
function CrossLayer({ children, reduce }: { children: React.ReactNode; reduce: boolean | null }) {
  return (
    <motion.div
      style={{ position: 'absolute', inset: 0 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.16 }}
    >
      {children}
    </motion.div>
  )
}

function Scrubber({ reduce, progress, onScrub }: { reduce: boolean | null; progress: number; onScrub: (v: number) => void }) {
  const [scrubbing, setScrubbing] = useState(false)
  const total = 232
  const cur = Math.round(progress * total)
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onScrub(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)))
  }
  return (
    <div className="di-scrub">
      <div
        className="di-track"
        onPointerDown={(e) => { seek(e); e.currentTarget.setPointerCapture(e.pointerId); setScrubbing(true) }}
        onPointerMove={(e) => { if (scrubbing) seek(e) }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); setScrubbing(false) }}
        onPointerCancel={() => setScrubbing(false)}
      >
        <motion.div className="di-fill" animate={{ width: `${progress * 100}%` }} transition={reduce || scrubbing ? { duration: 0 } : spring.track} />
        <motion.div className="di-knob" animate={{ left: `${progress * 100}%`, scale: scrubbing && !reduce ? 1.3 : 1 }} transition={reduce || scrubbing ? { duration: 0 } : spring.track} />
      </div>
      <div className="di-times">
        <span>{fmt(cur)}</span>
        <span>-{fmt(total - cur)}</span>
      </div>
    </div>
  )
}
