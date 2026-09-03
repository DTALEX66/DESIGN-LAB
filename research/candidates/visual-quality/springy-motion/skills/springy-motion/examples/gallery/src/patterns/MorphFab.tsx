import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

/**
 * FAB → action pills, blur-morph (recreated from a Nitish Khagwal reference).
 *
 * The "+" scales down to a dot and BLURS OUT while the two pills deblur, scale up,
 * and spread apart from center. Heavy blur at the midpoint masks the swap — Emil
 * Kowalski's "reach for blur to mask an awkward transition". A spring on scale/x
 * gives the settle; blur + opacity run on a quick tween underneath.
 */
const ACTIONS = [
  {
    key: 'schedule',
    label: 'Schedule',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3.2" y="4.2" width="17.6" height="16.6" rx="4.4" fill="currentColor" />
        <rect x="3.2" y="4.2" width="17.6" height="4.4" rx="2.2" fill="currentColor" />
        <g fill="#fff">
          <circle cx="8" cy="12.4" r="1.05" /><circle cx="12" cy="12.4" r="1.05" /><circle cx="16" cy="12.4" r="1.05" />
          <circle cx="8" cy="16.4" r="1.05" /><circle cx="12" cy="16.4" r="1.05" /><circle cx="16" cy="16.4" r="1.05" />
        </g>
      </svg>
    ),
  },
  {
    key: 'remind',
    label: 'Remind',
    icon: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.4a5.4 5.4 0 0 0-5.4 5.4v3.1L5 14.6c-.5.8.1 1.9 1.05 1.9h11.9c.95 0 1.55-1.1 1.05-1.9l-1.6-3.7V7.8A5.4 5.4 0 0 0 12 2.4Z" />
        <path d="M9.7 18.4a2.4 2.4 0 0 0 4.6 0Z" />
      </svg>
    ),
  },
]

export function MorphFab() {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)

  // blur+opacity ride a quick tween; scale/x ride the spring (settle)
  const blurT = reduce ? { duration: 0 } : { duration: 0.26, ease: 'easeOut' as const }

  return (
    <>
      <style>{`
        .mf-stage{
          position:relative; width:100%; min-height:150px;
          display:flex; align-items:center; justify-content:center;
          font-family:ui-sans-serif,system-ui,sans-serif;
        }
        .mf-center{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }

        .mf-fab{
          appearance:none; border:0; cursor:pointer; padding:0;
          width:58px; height:58px; border-radius:999px;
          background:#0b0b0c; color:#fff;
          display:grid; place-items:center;
          box-shadow:0 2px 6px rgba(24,24,27,.18), 0 14px 30px -12px rgba(11,11,12,.5);
          -webkit-tap-highlight-color:transparent;
        }
        .mf-fab svg{ display:block; }

        .mf-row{ display:flex; align-items:center; gap:16px; }
        .mf-pill{
          appearance:none; border:0; cursor:pointer;
          display:inline-flex; align-items:center; gap:9px;
          padding:13px 22px 13px 18px; border-radius:999px;
          background:#eeeef1; color:#18181b;
          font-size:17px; font-weight:640; letter-spacing:-.015em;
          box-shadow:0 1px 2px rgba(24,24,27,.05), 0 10px 24px -14px rgba(24,24,27,.3);
          white-space:nowrap; -webkit-tap-highlight-color:transparent;
          transition:background-color .16s ease;
        }
        .mf-pill:hover{ background:#e6e6ea; }
        .mf-pill svg{ display:block; flex:0 0 auto; }
      `}</style>

      <div className="mf-stage">
        <AnimatePresence initial={false} mode="popLayout">
          {!open ? (
            <motion.div key="fab" className="mf-center"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.35, filter: 'blur(7px)' }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.35, filter: 'blur(7px)' }}
              transition={reduce ? { duration: 0.16 } : { scale: spring.pop, filter: blurT, opacity: blurT }}
            >
              <motion.button
                type="button"
                className="mf-fab"
                aria-label="Add"
                onClick={() => setOpen(true)}
                whileHover={reduce ? undefined : { scale: 1.05 }}
                whileTap={reduce ? undefined : { scale: 0.9 }}
                transition={spring.snap}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5.4v13.2M5.4 12h13.2" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
                </svg>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="row" className="mf-center"
              initial={reduce ? { opacity: 0 } : { opacity: 0, filter: 'blur(7px)' }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, filter: 'blur(0px)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, filter: 'blur(7px)' }}
              transition={reduce ? { duration: 0.16 } : { filter: blurT, opacity: blurT }}
            >
              <div className="mf-row">
                {ACTIONS.map((a, i) => (
                  <motion.button
                    key={a.key}
                    type="button"
                    className="mf-pill"
                    onClick={() => setOpen(false)}
                    // spread apart from center: left pill starts shifted right, right pill left
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.72, x: i === 0 ? 38 : -38 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.72, x: i === 0 ? 38 : -38 }}
                    transition={reduce ? { duration: 0.16 } : { ...spring.pop, delay: i * 0.03, opacity: blurT }}
                    whileHover={reduce ? undefined : { scale: 1.04 }}
                    whileTap={reduce ? undefined : { scale: 0.96 }}
                  >
                    <span style={{ display: 'inline-flex' }}>{a.icon}</span>
                    {a.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
