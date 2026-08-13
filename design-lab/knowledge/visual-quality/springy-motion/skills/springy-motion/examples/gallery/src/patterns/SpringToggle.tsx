import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

const ROWS = [
  { id: 'wifi', label: 'Wi-Fi', hint: 'Auto-join networks', init: true },
  { id: 'airdrop', label: 'AirDrop', hint: 'Visible to everyone', init: false },
] as const

// The knob slides 20px and squashes mid-travel. The keyframed scale gives the
// squash-and-stretch its "stretch into travel → settle back" feel, while x
// rides the Snap spring so position and squash resolve together.
const squashEase = { duration: 0.34, times: [0, 0.45, 1], ease: 'easeOut' as const }

function Row({
  label,
  hint,
  on,
  onToggle,
  reduce,
}: {
  label: string
  hint: string
  on: boolean
  onToggle: () => void
  reduce: boolean | null
}) {
  return (
    <motion.button
      type="button"
      className="tgl-row"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      initial="rest"
      whileHover="hover"
      whileFocus="hover"
    >
      <span className="tgl-text">
        <span className="tgl-label">{label}</span>
        <span className="tgl-hint">{hint}</span>
      </span>

      <motion.span
        className="tgl-track"
        animate={{ backgroundColor: on ? '#2563eb' : '#e7e7ea' }}
        transition={reduce ? { duration: 0 } : spring.track}
      >
        <motion.span
          className="tgl-knob"
          initial={false}
          variants={reduce ? undefined : { rest: { scale: 1 }, hover: { scale: 1.05 } }}
          animate={
            reduce
              ? { x: on ? 20 : 0 }
              : {
                  x: on ? 20 : 0,
                  scaleX: [1, 1.18, 1],
                  scaleY: [1, 0.86, 1],
                }
          }
          transition={
            reduce
              ? { duration: 0 }
              : {
                  x: spring.snap,
                  scaleX: squashEase,
                  scaleY: squashEase,
                  scale: spring.snap,
                }
          }
        />
      </motion.span>
    </motion.button>
  )
}

export function SpringToggle() {
  const reduce = useReducedMotion()
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ROWS.map((r) => [r.id, r.init])),
  )

  return (
    <>
      <style>{`
        .tgl-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 244px;
          font-family: ui-sans-serif, system-ui, sans-serif;
          color: #18181b;
        }
        .tgl-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          padding: 12px 14px;
          background: #fff;
          border: 1px solid #e7e7ea;
          border-radius: 14px;
          cursor: pointer;
          text-align: left;
          font: inherit;
          color: inherit;
          box-shadow: 0 1px 2px rgba(24,24,27,.06);
          transition: border-color .18s ease, box-shadow .18s ease;
        }
        .tgl-row:hover {
          border-color: #dcdce0;
          box-shadow: 0 1px 2px rgba(24,24,27,.06), 0 8px 24px -12px rgba(24,24,27,.18);
        }
        .tgl-row:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }
        .tgl-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .tgl-label {
          font-size: 14px;
          font-weight: 560;
          letter-spacing: -.01em;
          line-height: 1.2;
        }
        .tgl-hint {
          font-size: 11.5px;
          color: #71717a;
          line-height: 1.2;
        }
        .tgl-track {
          position: relative;
          flex: none;
          width: 52px;
          height: 32px;
          border-radius: 999px;
          box-shadow: inset 0 1px 2px rgba(24,24,27,.10);
        }
        .tgl-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(24,24,27,.18), 0 2px 6px -1px rgba(24,24,27,.22);
          will-change: transform;
        }
      `}</style>

      <div className="tgl-wrap">
        {ROWS.map((r) => (
          <Row
            key={r.id}
            label={r.label}
            hint={r.hint}
            on={state[r.id]}
            reduce={reduce}
            onToggle={() => setState((s) => ({ ...s, [r.id]: !s[r.id] }))}
          />
        ))}
      </div>
    </>
  )
}
