import { useState } from 'react'
import { motion, useReducedMotion, type Transition } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

type Row = { id: string; label: string }

const ROWS: Row[] = [
  { id: 'sync', label: 'Sync across devices' },
  { id: 'beta', label: 'Early access builds' },
  { id: 'digest', label: 'Weekly digest' },
]

export function DrawCheckbox() {
  const reduce = useReducedMotion()
  const [checked, setChecked] = useState<Record<string, boolean>>({
    sync: true,
    beta: false,
    digest: false,
  })

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))

  // Fill/box pop spring (or no overshoot under reduced motion).
  const boxTransition: Transition = reduce ? spring.glide : spring.pop

  // Row hover: subtle lift + tint; box scales a touch in concert.
  const rowVariants = {
    rest: { y: 0, backgroundColor: 'rgba(250,250,250,0)' },
    hover: { y: -1, backgroundColor: 'rgba(250,250,250,1)' },
  } as const
  const boxVariants = {
    rest: { scale: 1 },
    hover: { scale: reduce ? 1 : 1.06 },
  } as const

  return (
    <>
      <style>{`
        .chk-root {
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          width: 248px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px;
          background: #fff;
          border: 1px solid #e7e7ea;
          border-radius: 16px;
          box-shadow: 0 1px 2px rgba(24,24,27,.06), 0 8px 24px -12px rgba(24,24,27,.18);
        }
        .chk-row {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          border: 0;
          background: transparent;
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          color: #18181b;
          font-size: 14px;
          line-height: 1;
          -webkit-tap-highlight-color: transparent;
        }
        .chk-row:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: -2px;
        }
        .chk-box {
          position: relative;
          flex: 0 0 auto;
          width: 24px;
          height: 24px;
          border-radius: 7px;
          display: grid;
          place-items: center;
        }
        .chk-box-bg {
          position: absolute;
          inset: 0;
          border-radius: 7px;
          box-shadow: inset 0 0 0 2px #d4d4d8;
        }
        .chk-svg {
          position: relative;
          width: 24px;
          height: 24px;
          overflow: visible;
        }
        .chk-label {
          flex: 1 1 auto;
          font-weight: 450;
          letter-spacing: -0.01em;
          font-variant-numeric: tabular-nums;
        }
        .chk-count {
          flex: 0 0 auto;
          font-size: 12px;
          color: #71717a;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }
      `}</style>

      <div className="chk-root">
        {ROWS.map((row) => {
          const on = checked[row.id]
          return (
            <motion.button
              key={row.id}
              type="button"
              className="chk-row"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(row.id)}
              initial="rest"
              animate="rest"
              whileHover="hover"
              whileFocus="hover"
              variants={rowVariants}
              transition={spring.snap}
            >
              <motion.span className="chk-box" variants={boxVariants} transition={spring.snap}>
                {/* Fill layer — crossfades to accent and pops on check. */}
                <motion.span
                  className="chk-box-bg"
                  initial={false}
                  animate={{
                    backgroundColor: on ? '#2563eb' : 'rgba(37,99,235,0)',
                    boxShadow: on
                      ? 'inset 0 0 0 2px #2563eb'
                      : 'inset 0 0 0 2px #d4d4d8',
                    scale: reduce ? 1 : on ? [1, 1.12, 1] : 1,
                  }}
                  transition={{
                    backgroundColor: spring.glide,
                    boxShadow: spring.glide,
                    scale: boxTransition,
                  }}
                />
                {/* Checkmark — draws in just after the fill begins. */}
                <svg
                  className="chk-svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M6 12.6 L10.2 16.6 L18 7.6"
                    stroke="#fff"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={false}
                    animate={{ pathLength: on ? 1 : 0 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : on
                          ? { ...spring.glide, delay: 0.08 }
                          : spring.snap
                    }
                  />
                </svg>
              </motion.span>

              <span className="chk-label">{row.label}</span>
              <span className="chk-count">{on ? 'on' : 'off'}</span>
            </motion.button>
          )
        })}
      </div>
    </>
  )
}
