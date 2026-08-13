import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

const RAYS = 8

// each ray retracts/extends with a tiny per-index stagger for a "magical" bloom
const rayVariants: Variants = {
  sun: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { ...spring.pop, delay: 0.04 + i * 0.012 },
  }),
  moon: (i: number) => ({
    scale: 0,
    opacity: 0,
    transition: { ...spring.snap, delay: i * 0.008 },
  }),
  still: { scale: 1, opacity: 1, transition: { duration: 0 } },
}

export function ThemeSwitch() {
  const reduce = useReducedMotion()
  const [dark, setDark] = useState(false)

  return (
    <>
      <style>{`
        .thm-root {
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 248px;
        }
        .thm-preview {
          position: relative;
          width: 100%;
          height: 96px;
          border-radius: 14px;
          border: 1px solid var(--thm-line);
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(24,24,27,.06), 0 8px 24px -12px rgba(24,24,27,.18);
          display: grid;
          place-items: center;
          isolation: isolate;
        }
        .thm-preview-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .thm-preview-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          pointer-events: none;
        }
        .thm-preview-title {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
          font-variant-numeric: tabular-nums;
        }
        .thm-preview-sub {
          font-size: 11px;
          font-weight: 500;
        }
        .thm-switch {
          appearance: none;
          border: 1px solid var(--thm-line);
          background: #fff;
          width: 56px;
          height: 56px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          cursor: pointer;
          padding: 0;
          position: relative;
          box-shadow: 0 1px 2px rgba(24,24,27,.06), 0 8px 24px -12px rgba(24,24,27,.18);
          transition: border-color .25s ease, background-color .25s ease, box-shadow .25s ease;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .thm-switch:hover { border-color: #d4d4d8; }
        .thm-switch:focus-visible {
          box-shadow: 0 0 0 3px rgba(37,99,235,.35), 0 8px 24px -12px rgba(24,24,27,.18);
          border-color: var(--thm-accent);
        }
        .thm-switch[data-dark="true"] {
          background: #1f2024;
          border-color: #34343b;
        }
        .thm-icon {
          width: 30px;
          height: 30px;
          position: relative;
          display: block;
        }
        .thm-icon-layer {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
        }
        .thm-svg { display: block; overflow: visible; }
        .thm-ray {
          transform-box: fill-box;
          transform-origin: center;
        }
      `}</style>

      <div
        className="thm-root"
        style={
          {
            ['--thm-line' as string]: '#e7e7ea',
            ['--thm-accent' as string]: '#2563eb',
          } as React.CSSProperties
        }
      >
        <div className="thm-preview" aria-hidden="true">
          <motion.div
            className="thm-preview-bg"
            initial={false}
            animate={{ backgroundColor: dark ? '#18181b' : '#fafafa' }}
            transition={reduce ? { duration: 0 } : { ...spring.glide }}
          />
          <div className="thm-preview-content">
            <motion.span
              className="thm-preview-title"
              initial={false}
              animate={{ color: dark ? '#fafafa' : '#18181b' }}
              transition={reduce ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
            >
              {dark ? 'Dark' : 'Light'}
            </motion.span>
            <motion.span
              className="thm-preview-sub"
              initial={false}
              animate={{ color: dark ? '#a1a1aa' : '#71717a' }}
              transition={reduce ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
            >
              theme preview
            </motion.span>
          </div>
        </div>

        <motion.button
          type="button"
          className="thm-switch"
          data-dark={dark}
          aria-pressed={dark}
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setDark((d) => !d)}
          whileHover={reduce ? undefined : { scale: 1.05 }}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          transition={spring.snap}
        >
          <motion.span
            className="thm-icon"
            initial={false}
            animate={{ rotate: reduce ? 0 : dark ? -40 : 0 }}
            transition={reduce ? { duration: 0 } : { ...spring.lively }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {dark ? (
                <motion.span
                  key="moon"
                  className="thm-icon-layer"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 40 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 40 }}
                  transition={reduce ? { duration: 0 } : { ...spring.pop }}
                >
                  <svg className="thm-svg" width="30" height="30" viewBox="0 0 30 30">
                    <defs>
                      <mask id="thm-moon-mask">
                        <rect x="0" y="0" width="30" height="30" fill="#000" />
                        <circle cx="15" cy="15" r="10" fill="#fff" />
                        <circle cx="20.5" cy="11.5" r="9" fill="#000" />
                      </mask>
                    </defs>
                    <circle cx="15" cy="15" r="10" fill="#e4e4e7" mask="url(#thm-moon-mask)" />
                  </svg>
                </motion.span>
              ) : (
                <motion.span
                  key="sun"
                  className="thm-icon-layer"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -40 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -40 }}
                  transition={reduce ? { duration: 0 } : { ...spring.pop }}
                >
                  <svg className="thm-svg" width="30" height="30" viewBox="0 0 30 30">
                    <circle cx="15" cy="15" r="6.5" fill="#f59e0b" />
                    {Array.from({ length: RAYS }).map((_, i) => {
                      const angle = (i / RAYS) * Math.PI * 2
                      const inner = 9.5
                      const outer = 13
                      const x1 = 15 + Math.cos(angle) * inner
                      const y1 = 15 + Math.sin(angle) * inner
                      const x2 = 15 + Math.cos(angle) * outer
                      const y2 = 15 + Math.sin(angle) * outer
                      return (
                        <motion.line
                          key={i}
                          className="thm-ray"
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#f59e0b"
                          strokeWidth={2}
                          strokeLinecap="round"
                          custom={i}
                          variants={reduce ? undefined : rayVariants}
                          initial={reduce ? false : 'moon'}
                          animate={reduce ? undefined : 'sun'}
                          exit={reduce ? undefined : 'moon'}
                        />
                      )
                    })}
                  </svg>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </motion.button>
      </div>
    </>
  )
}
