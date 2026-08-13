import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

const HOLD_MS = 1100
const RESET_MS = 1400

type Phase = 'idle' | 'holding' | 'success'

export function HoldToConfirm() {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const [holding, setHolding] = useState(false)

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current)
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const complete = () => {
    clearHold()
    setHolding(false)
    setPhase('success')
    resetTimer.current = setTimeout(() => {
      setPhase('idle')
    }, RESET_MS)
  }

  const startHold = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (phase === 'success') return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setHolding(true)
    setPhase('holding')
    clearHold()
    holdTimer.current = setTimeout(complete, HOLD_MS)
  }

  const cancelHold = () => {
    if (phase === 'success') return
    clearHold()
    setHolding(false)
    setPhase('idle')
  }

  const success = phase === 'success'

  return (
    <>
      <style>{`
        .htc-wrap {
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          width: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .htc-btn {
          position: relative;
          width: 100%;
          height: 48px;
          border-radius: 12px;
          border: 1px solid #f3c4c4;
          background: #fff5f5;
          color: #ef4444;
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: -0.01em;
          cursor: pointer;
          overflow: hidden;
          padding: 0;
          outline: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          box-shadow: 0 1px 2px rgba(24,24,27,.06), 0 8px 24px -12px rgba(24,24,27,.18);
          transition: border-color .25s ease, background-color .25s ease, color .25s ease;
        }
        .htc-btn:focus-visible {
          box-shadow: 0 0 0 3px rgba(239,68,68,.22), 0 1px 2px rgba(24,24,27,.06);
        }
        .htc-btn.htc-success {
          border-color: #16a34a;
          background: #16a34a;
          color: #fff;
          cursor: default;
          box-shadow: 0 1px 2px rgba(22,163,74,.18), 0 10px 26px -12px rgba(22,163,74,.45);
        }
        .htc-fill {
          position: absolute;
          inset: 0;
          transform-origin: left center;
          background: linear-gradient(90deg, #fecaca 0%, #fca5a5 100%);
          will-change: transform;
        }
        .htc-content {
          position: relative;
          z-index: 1;
          height: 100%;
          display: grid;
          place-items: center;
        }
        .htc-label {
          display: inline-flex;
          align-items: center;
          font-variant-numeric: tabular-nums;
        }
        .htc-check {
          width: 17px;
          height: 17px;
          display: block;
        }
        .htc-hint {
          font-size: 11.5px;
          color: #71717a;
          letter-spacing: -0.005em;
          min-height: 14px;
          text-align: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .htc-btn { transition: none; }
        }
      `}</style>

      <div className="htc-wrap">
        <motion.button
          type="button"
          className={`htc-btn${success ? ' htc-success' : ''}`}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          animate={{ scale: !reduce && holding && !success ? 0.97 : 1 }}
          whileHover={!reduce && !holding && !success ? { scale: 1.02 } : undefined}
          transition={spring.snap}
          aria-label={success ? 'Deleted' : 'Hold to delete'}
        >
          {!reduce && (
            <motion.div
              className="htc-fill"
              initial={false}
              // Red is driven by OPACITY (visible only while holding). On success it
              // fades out IN PLACE (scaleX stays 1, never shrinks); on reset it's
              // already invisible — so no red flash and no fast shuffle-back.
              animate={{ scaleX: holding || success ? 1 : 0, opacity: holding ? 1 : 0 }}
              transition={{
                scaleX: holding && !success ? { duration: HOLD_MS / 1000, ease: 'linear' } : success ? { duration: 0 } : spring.track,
                opacity: { duration: success ? 0.32 : 0.18, ease: 'easeOut' },
              }}
            />
          )}

          <div className="htc-content">
            {/* labels share grid cell 1/1 → overlap-crossfade, no blank gap */}
            <AnimatePresence initial={false}>
              {success ? (
                <motion.span
                  key="done"
                  className="htc-label"
                  style={{ gridArea: '1 / 1' }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                  transition={reduce ? { duration: 0.18 } : spring.pop}
                >
                  <motion.svg
                    className="htc-check"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                    style={{ marginRight: 6 }}
                  >
                    <motion.path
                      d="M3.5 9.5L7 13L14.5 5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { duration: 0.32, ease: 'easeOut', delay: 0.06 }
                      }
                    />
                  </motion.svg>
                  Deleted
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  className="htc-label"
                  style={{ gridArea: '1 / 1' }}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                  transition={reduce ? { duration: 0.18 } : spring.snap}
                >
                  Hold to delete
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.button>

        <div className="htc-hint" aria-live="polite">
          {success
            ? 'Item removed'
            : holding
              ? 'Keep holding…'
              : 'Press and hold to confirm'}
        </div>
      </div>
    </>
  )
}
