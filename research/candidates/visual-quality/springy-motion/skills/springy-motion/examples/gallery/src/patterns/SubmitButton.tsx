import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

type Phase = 'idle' | 'loading' | 'success'

export function SubmitButton() {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout)
    }
  }, [])

  function run() {
    if (phase !== 'idle') return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPhase('loading')
    timers.current.push(setTimeout(() => setPhase('success'), 1200))
    timers.current.push(setTimeout(() => setPhase('idle'), 1200 + 1400))
  }

  // ----- Reduced motion: pure opacity crossfade between three labels -----
  if (reduce) {
    const label = phase === 'idle' ? 'Place order' : phase === 'loading' ? 'Working…' : 'Confirmed'
    return (
      <>
        <Style />
        <div className="sub-wrap">
          <button
            type="button"
            className={'sub-btn sub-flat' + (phase === 'success' ? ' sub-ok' : '')}
            onClick={run}
            disabled={phase !== 'idle'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={phase}
                className="sub-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {label}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </>
    )
  }

  // ----- Full motion: width morphs idle pill -> loading circle -> success pill -----
  return (
    <>
      <Style />
      <div className="sub-wrap">
        <motion.button
          type="button"
          layout
          className={
            'sub-btn' +
            (phase === 'loading' ? ' sub-circle' : '') +
            (phase === 'success' ? ' sub-ok' : '')
          }
          onClick={run}
          disabled={phase !== 'idle'}
          whileHover={phase === 'idle' ? { scale: 1.03, transition: spring.snap } : undefined}
          whileTap={phase === 'idle' ? { scale: 0.96, transition: spring.snap } : undefined}
          transition={spring.glide}
          aria-live="polite"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {phase === 'idle' && (
              <motion.span
                key="idle"
                layout="position"
                className="sub-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={spring.snap}
              >
                Place order
              </motion.span>
            )}

            {phase === 'loading' && (
              <motion.span
                key="loading"
                layout
                className="sub-ring-slot"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={spring.pop}
              >
                <motion.span
                  className="sub-ring"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.75, ease: 'linear', repeat: Infinity }}
                />
              </motion.span>
            )}

            {phase === 'success' && (
              <motion.span
                key="success"
                layout="position"
                className="sub-success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={spring.snap}
              >
                <motion.svg
                  className="sub-check"
                  viewBox="0 0 24 24"
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={spring.pop}
                  aria-hidden
                >
                  <motion.path
                    d="M5 12.5 10 17.5 19 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ ...spring.glide, delay: 0.06 }}
                  />
                </motion.svg>
                <motion.span
                  className="sub-label"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring.lively, delay: 0.08 }}
                >
                  Confirmed
                </motion.span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  )
}

function Style() {
  return (
    <style>{`
      .sub-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 220px;
        min-height: 96px;
        font-family: ui-sans-serif, system-ui, sans-serif;
      }
      .sub-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 46px;
        padding: 0 22px;
        border: none;
        border-radius: 14px;
        background: #2563eb;
        color: #fff;
        font-size: 14.5px;
        font-weight: 600;
        letter-spacing: -0.01em;
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;
        box-shadow:
          0 1px 2px rgba(24, 24, 27, 0.06),
          0 8px 24px -12px rgba(37, 99, 235, 0.55);
        -webkit-tap-highlight-color: transparent;
        transition: background-color 0.35s ease, box-shadow 0.35s ease;
      }
      .sub-btn:disabled { cursor: default; }
      .sub-btn:not(:disabled):hover { background: #1d56d6; }
      .sub-btn:focus-visible {
        outline: 2px solid #2563eb;
        outline-offset: 3px;
      }
      .sub-circle {
        padding: 0;
        width: 46px;
        border-radius: 50%;
        box-shadow:
          0 1px 2px rgba(24, 24, 27, 0.06),
          0 8px 22px -12px rgba(37, 99, 235, 0.5);
      }
      .sub-ok {
        background: #16a34a;
        box-shadow:
          0 1px 2px rgba(24, 24, 27, 0.06),
          0 8px 24px -12px rgba(22, 163, 74, 0.55);
      }
      .sub-ok:not(:disabled):hover { background: #16a34a; }
      .sub-flat { box-shadow: 0 1px 2px rgba(24, 24, 27, 0.06); }

      .sub-label {
        display: inline-block;
        font-variant-numeric: tabular-nums;
      }

      .sub-ring-slot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
      }
      .sub-ring {
        display: block;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2.4px solid rgba(255, 255, 255, 0.32);
        border-top-color: #fff;
        box-sizing: border-box;
      }

      .sub-success {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      .sub-check {
        width: 18px;
        height: 18px;
        display: block;
        color: #fff;
      }
    `}</style>
  )
}
