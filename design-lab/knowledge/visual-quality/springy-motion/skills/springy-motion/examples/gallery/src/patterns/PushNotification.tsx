import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
  type Variants,
} from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

const AUTO_DISMISS_MS = 3800

// Stagger items (icon -> title -> body) reveal after the banner lands.
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  shown: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...spring.pop, delay: 0.18 + i * 0.04 },
  }),
  flat: { opacity: 1, y: 0, transition: { duration: 0 } },
}

export function PushNotification() {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // Tracks how the banner should leave: swipe-out carries velocity.
  const flingVelocity = useRef(0)
  const draggingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const armTimer = () => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      flingVelocity.current = 0
      setOpen(false)
    }, AUTO_DISMISS_MS)
  }

  // Auto-dismiss countdown; pauses while expanded so the user can read.
  useEffect(() => {
    if (!open || expanded) {
      clearTimer()
      return
    }
    armTimer()
    return clearTimer
  }, [open, expanded])

  useEffect(() => clearTimer, [])

  const show = () => {
    flingVelocity.current = 0
    setExpanded(false)
    setOpen(true)
  }

  const dismiss = () => {
    flingVelocity.current = 0
    setOpen(false)
  }

  const handleDragStart = () => {
    draggingRef.current = true
    clearTimer()
  }

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    // Defer click suppression so the tap handler doesn't fire on drag release.
    window.setTimeout(() => {
      draggingRef.current = false
    }, 0)
    if (info.offset.y < -40 || info.velocity.y < -400) {
      flingVelocity.current = info.velocity.y
      setOpen(false)
    } else {
      if (!expanded) armTimer()
    }
  }

  const handleTap = () => {
    if (draggingRef.current) return
    setExpanded((e) => !e)
  }

  return (
    <>
      <style>{`
        .push-root {
          position: relative;
          overflow: hidden;
          width: 100%;
          min-height: 230px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: ui-sans-serif, system-ui, sans-serif;
          color: #18181b;
          padding: 12px;
          box-sizing: border-box;
        }
        .push-trigger {
          appearance: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: #fff;
          background: #2563eb;
          padding: 10px 18px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 1px 2px rgba(24,24,27,.06), 0 8px 24px -12px rgba(37,99,235,.55);
          -webkit-tap-highlight-color: transparent;
          transition: box-shadow .2s ease;
        }
        .push-trigger:hover {
          box-shadow: 0 1px 2px rgba(24,24,27,.06), 0 11px 26px -12px rgba(37,99,235,.5);
        }
        .push-trigger:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 3px;
        }
        .push-bell {
          display: inline-flex;
        }
        .push-stage {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .push-banner {
          pointer-events: auto;
          width: 100%;
          max-width: 268px;
          background: #fff;
          border: 1px solid #e7e7ea;
          border-radius: 16px;
          box-shadow: 0 1px 2px rgba(24,24,27,.06), 0 18px 40px -16px rgba(24,24,27,.28);
          padding: 11px;
          cursor: grab;
          -webkit-tap-highlight-color: transparent;
          overflow: hidden;
        }
        .push-banner:active {
          cursor: grabbing;
        }
        .push-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .push-icon {
          flex: 0 0 auto;
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: linear-gradient(150deg, #3b82f6, #2563eb);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 4px 10px -4px rgba(37,99,235,.6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .push-text {
          flex: 1 1 auto;
          min-width: 0;
        }
        .push-title {
          font-size: 13px;
          font-weight: 650;
          letter-spacing: -0.01em;
          line-height: 1.25;
          color: #18181b;
        }
        .push-body {
          font-size: 12px;
          line-height: 1.3;
          color: #71717a;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .push-time {
          flex: 0 0 auto;
          font-size: 11px;
          color: #a1a1aa;
          font-variant-numeric: tabular-nums;
          align-self: flex-start;
        }
        .push-close {
          appearance: none;
          border: 1px solid #e7e7ea;
          background: #fafafa;
          color: #71717a;
          width: 20px;
          height: 20px;
          border-radius: 7px;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          align-self: flex-start;
          padding: 0;
        }
        .push-close:hover { color: #18181b; background: #f4f4f5; }
        .push-extra {
          margin-top: 9px;
          padding-top: 9px;
          border-top: 1px solid #f0f0f2;
        }
        .push-extra-line {
          font-size: 12px;
          line-height: 1.35;
          color: #52525b;
        }
        .push-actions {
          display: flex;
          gap: 7px;
          margin-top: 9px;
        }
        .push-ghost {
          appearance: none;
          flex: 1 1 0;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.01em;
          padding: 7px 10px;
          border-radius: 9px;
          border: 1px solid #e7e7ea;
          background: #fff;
          color: #18181b;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .push-ghost:hover { background: #fafafa; }
        .push-ghost.push-accent { color: #2563eb; border-color: #dbe5fb; background: #f5f8ff; }
        .push-ghost.push-accent:hover { background: #eef3ff; }
        .push-grip {
          width: 30px;
          height: 3px;
          border-radius: 2px;
          background: #e4e4e7;
          margin: 1px auto 8px;
        }
        .push-hint {
          position: absolute;
          bottom: 12px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 11px;
          color: #a1a1aa;
          letter-spacing: 0.01em;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .push-banner { cursor: default; }
        }
      `}</style>

      <div className="push-root">
        <AnimatePresence>
          {!open && (
            <motion.button
              key="trigger"
              type="button"
              className="push-trigger"
              onClick={show}
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.94 }}
              // subtle lift only — the shadow is handled in CSS :hover so it
              // transitions and reverts cleanly (Motion animating a box-shadow
              // string back to the CSS base looks like a "glow flickering out").
              whileHover={reduce ? undefined : { y: -2, transition: spring.snap }}
              whileTap={
                reduce ? undefined : { scale: 0.95, y: 0, transition: spring.snap }
              }
              transition={spring.pop}
            >
              <span className="push-bell" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1.6a3.4 3.4 0 0 0-3.4 3.4v2.2L3.5 9.7c-.3.5.06 1.1.65 1.1h7.7c.59 0 .95-.6.65-1.1L11.4 7.2V5A3.4 3.4 0 0 0 8 1.6Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.6 12.6a1.5 1.5 0 0 0 2.8 0"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              Send notification
            </motion.button>
          )}
        </AnimatePresence>

        <div className="push-stage">
          <AnimatePresence>
            {open && (
              <motion.div
                key="banner"
                className="push-banner"
                layout
                drag={reduce ? false : 'y'}
                dragDirectionLock
                dragConstraints={{ top: -400, bottom: 0 }}
                dragElastic={{ top: 0.6, bottom: 0.04 }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onTap={handleTap}
                initial={
                  reduce
                    ? { opacity: 0, y: 0 }
                    : { opacity: 0, y: '-130%', scale: 0.96 }
                }
                animate={
                  reduce
                    ? { opacity: 1, y: 0 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                exit={
                  reduce
                    ? { opacity: 0, transition: { duration: 0.18 } }
                    : {
                        opacity: 0,
                        y: '-150%',
                        scale: 0.97,
                        transition: {
                          ...spring.track,
                          velocity: flingVelocity.current,
                        },
                      }
                }
                transition={
                  reduce
                    ? { duration: 0.22 }
                    : { ...spring.track, opacity: { duration: 0.18 } }
                }
                whileTap={reduce ? undefined : { scale: 0.985 }}
              >
                {!reduce && <motion.div layout="position" className="push-grip" />}

                <motion.div layout="position" className="push-row">
                  <motion.div
                    className="push-icon"
                    custom={0}
                    variants={itemVariants}
                    initial={reduce ? false : 'hidden'}
                    animate={reduce ? 'flat' : 'shown'}
                    aria-hidden
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 4.6c0-.66.54-1.2 1.2-1.2h7.6c.66 0 1.2.54 1.2 1.2v5.1c0 .66-.54 1.2-1.2 1.2H6.7l-2.5 1.9V10.9H4.2c-.66 0-1.2-.54-1.2-1.2V4.6Z"
                        fill="currentColor"
                      />
                    </svg>
                  </motion.div>

                  <div className="push-text">
                    <motion.div
                      className="push-title"
                      custom={1}
                      variants={itemVariants}
                      initial={reduce ? false : 'hidden'}
                      animate={reduce ? 'flat' : 'shown'}
                    >
                      New message
                    </motion.div>
                    <motion.div
                      className="push-body"
                      custom={2}
                      variants={itemVariants}
                      initial={reduce ? false : 'hidden'}
                      animate={reduce ? 'flat' : 'shown'}
                    >
                      Alex sent you a photo
                    </motion.div>
                  </div>

                  {reduce ? (
                    <button
                      type="button"
                      className="push-close"
                      onClick={(e) => {
                        e.stopPropagation()
                        dismiss()
                      }}
                      aria-label="Dismiss notification"
                    >
                      ×
                    </button>
                  ) : (
                    <motion.div
                      className="push-time"
                      custom={1}
                      variants={itemVariants}
                      initial="hidden"
                      animate="shown"
                    >
                      now
                    </motion.div>
                  )}
                </motion.div>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key="extra"
                      className="push-extra"
                      layout
                      initial={{ opacity: 0, y: reduce ? 0 : -4 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: reduce
                          ? { duration: 0.18 }
                          : { ...spring.pop, opacity: { duration: 0.2 } },
                      }}
                      exit={{
                        opacity: 0,
                        y: reduce ? 0 : -4,
                        transition: { duration: 0.14 },
                      }}
                    >
                      <div className="push-extra-line">
                        Tap to view in Messages
                      </div>
                      <div className="push-actions">
                        <button
                          type="button"
                          className="push-ghost push-accent"
                          onClick={(e) => {
                            e.stopPropagation()
                            dismiss()
                          }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="push-ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            dismiss()
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {open && !expanded && (
          <div className="push-hint">
            {reduce ? 'Tap to expand' : 'Swipe up to dismiss · tap to expand'}
          </div>
        )}
      </div>
    </>
  )
}
