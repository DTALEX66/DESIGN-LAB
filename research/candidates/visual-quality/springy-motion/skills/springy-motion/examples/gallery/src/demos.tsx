import { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { PRESET_LIST, PRESETS, spring } from './springs'

/* ----------------------------------------------------------------------------
 * 1. Preset playground — replay each spring live on translate + scale.
 * -------------------------------------------------------------------------- */
function PresetPlayground() {
  const [on, setOn] = useState(true)
  return (
    <div className="pp">
      <div className="pp-track">
        {PRESET_LIST.map((p) => (
          <div className="pp-row" key={p.key}>
            <span className="pp-name">{p.name}</span>
            <div className="pp-rail">
              <motion.div className="pp-dot" animate={{ x: on ? 230 : 0 }} transition={spring(p.key)} />
            </div>
            <motion.div className="pp-box" animate={{ scale: on ? 1 : 0.4 }} transition={spring(p.key)} />
          </div>
        ))}
      </div>
      <button className="btn" onClick={() => setOn((v) => !v)}>
        Replay
      </button>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * 2. Press feedback (Snap) + Pop-in entrance (Pop).
 * -------------------------------------------------------------------------- */
function PressAndPop() {
  const reduce = useReducedMotion()
  const [items, setItems] = useState([0, 1])
  const [next, setNext] = useState(2)
  return (
    <div className="col">
      <motion.button
        className="btn primary"
        whileTap={reduce ? undefined : { scale: 0.96 }}
        transition={spring('snap')}
      >
        Press me
      </motion.button>
      <div className="chiprow">
        <AnimatePresence mode="popLayout">
          {items.map((it) => (
            <motion.span
              layout
              key={it}
              className="chip"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={spring('pop')}
            >
              Item {it + 1}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="row">
        <button
          className="btn"
          onClick={() => {
            setItems((s) => [...s, next])
            setNext((n) => n + 1)
          }}
        >
          Add (pop-in)
        </button>
        <button className="btn" onClick={() => setItems((s) => s.slice(0, -1))}>
          Remove
        </button>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * 3. Draggable sheet (Track) — drag down to dismiss, springs back otherwise.
 * -------------------------------------------------------------------------- */
function Sheet() {
  const [open, setOpen] = useState(true)
  const reduce = useReducedMotion()
  return (
    <div className="sheet-stage">
      <button className="btn" onClick={() => setOpen(true)}>
        Open sheet
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="sheet"
              initial={reduce ? { opacity: 0 } : { y: '100%' }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              exit={reduce ? { opacity: 0 } : { y: '100%' }}
              transition={spring('glide')}
              drag={reduce ? false : 'y'}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 500) setOpen(false)
              }}
            >
              <div className="grabber" />
              <h4>Drag me down</h4>
              <p>Past 120px or a fast flick dismisses. Otherwise it springs home.</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * 4. Shared-element morph (Glide/Pop) — thumbnail expands into a card.
 * -------------------------------------------------------------------------- */
const SWATCHES = [
  { id: 'a', c: '#2563eb' },
  { id: 'b', c: '#db2777' },
  { id: 'c', c: '#16a34a' },
  { id: 'd', c: '#d97706' },
]
function SharedElement() {
  const [sel, setSel] = useState<string | null>(null)
  return (
    <LayoutGroup>
      <div className="grid4">
        {SWATCHES.map((s) => (
          <motion.button
            layoutId={`sw-${s.id}`}
            key={s.id}
            className="swatch"
            style={{ background: s.c }}
            onClick={() => setSel(s.id)}
            transition={spring('pop')}
          />
        ))}
      </div>
      <AnimatePresence>
        {sel && (
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSel(null)}>
            <motion.div
              layoutId={`sw-${sel}`}
              className="detail"
              style={{ background: SWATCHES.find((s) => s.id === sel)!.c }}
              transition={spring('pop')}
            >
              <span>Tap to close</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  )
}

/* ----------------------------------------------------------------------------
 * 5. Text morph (Pop) — Continue → Confirm with shared "Con".
 * -------------------------------------------------------------------------- */
function TextMorph() {
  const [confirm, setConfirm] = useState(false)
  return (
    <button className="btn primary morph" onClick={() => setConfirm((v) => !v)}>
      <span className="morph-fixed">Con</span>
      <span className="morph-swap">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={confirm ? 'firm' : 'tinue'}
            initial={{ y: '0.9em', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-0.9em', opacity: 0 }}
            transition={spring('snap')}
          >
            {confirm ? 'firm' : 'tinue'}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  )
}

/* ----------------------------------------------------------------------------
 * 6. Stagger reveal (Pop) — list cascades in.
 * -------------------------------------------------------------------------- */
function Stagger() {
  const [n, setN] = useState(0)
  const reduce = useReducedMotion()
  return (
    <div className="col">
      <button className="btn" onClick={() => setN((v) => v + 1)}>
        Replay stagger
      </button>
      <div className="stack" key={n}>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            className="bar"
            key={i}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring('pop'), delay: reduce ? 0 : i * 0.04 }}
          />
        ))}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * 7. Direction-aware tabs (Snap indicator + Glide panel).
 * -------------------------------------------------------------------------- */
const TABS = ['Overview', 'Activity', 'Settings']
function Tabs() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const select = (next: number) => {
    setDir(next > i ? 1 : -1)
    setI(next)
  }
  return (
    <div className="tabs">
      <LayoutGroup>
        <div className="seg">
          {TABS.map((t, idx) => (
            <button className={`seg-btn ${idx === i ? 'on' : ''}`} key={t} onClick={() => select(idx)}>
              {idx === i && <motion.span layoutId="pill" className="pill" transition={spring('snap')} />}
              <span className="seg-label">{t}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>
      <div className="panelwrap">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            className="panel"
            key={i}
            custom={dir}
            // Shared-axis (X) / carousel "push": the old panel slides fully OUT one
            // side while the new slides fully IN from the other — no fade. Direction
            // -aware via `dir`. Panels are position:absolute inset:0; the wrap clips
            // with overflow:hidden, so they travel the full width like a carousel.
            variants={
              reduce
                ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
                : {
                    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%' }),
                    center: { x: '0%' },
                    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%' }),
                  }
            }
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduce ? { duration: 0.16 } : { type: 'spring', visualDuration: 0.42, bounce: 0 }}
          >
            {TABS[i]} panel
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * 8. Number ticker (Snap, tabular) + success check (Pop).
 * -------------------------------------------------------------------------- */
function Ticker() {
  const [n, setN] = useState(42)
  const [ok, setOk] = useState(false)
  return (
    <div className="col">
      <div className="ticker">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={n}
            initial={{ y: '0.8em', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-0.8em', opacity: 0 }}
            transition={spring('snap')}
          >
            {n}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="row">
        <button className="btn" onClick={() => setN((v) => v + 7)}>
          +7
        </button>
        <button
          className="btn primary"
          onClick={() => {
            setOk(true)
            setTimeout(() => setOk(false), 1400)
          }}
        >
          Confirm
        </button>
      </div>
      <div className="check">
        <AnimatePresence>
          {ok && (
            <motion.div
              className="checkdot"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={spring('lively')}
            >
              ✓
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export const DEMOS: { title: string; note: string; Comp: React.FC }[] = [
  { title: 'Spring presets', note: 'One (duration, bounce) → Snap · Glide · Pop · Lively', Comp: PresetPlayground },
  { title: 'Press & pop-in', note: 'whileTap 0.96 (Snap) · AnimatePresence scale 0.93→1 (Pop)', Comp: PressAndPop },
  { title: 'Draggable sheet', note: 'Track · drag-y, dragElastic, velocity-dismiss', Comp: Sheet },
  { title: 'Shared-element morph', note: 'layoutId — the element travels, never duplicates', Comp: SharedElement },
  { title: 'Text morph', note: 'Continue → Confirm, shared "Con" (Family)', Comp: TextMorph },
  { title: 'Stagger', note: '40ms cascade (Pop)', Comp: Stagger },
  { title: 'Direction-aware tabs', note: 'layoutId pill (Snap) + shared-axis (X) carousel slide', Comp: Tabs },
  { title: 'Ticker & success', note: 'tabular roll (Snap) + check (Lively)', Comp: Ticker },
]

// referenced to keep PRESETS import used by type-checker in some build modes
export const _presetCount = Object.keys(PRESETS).length
