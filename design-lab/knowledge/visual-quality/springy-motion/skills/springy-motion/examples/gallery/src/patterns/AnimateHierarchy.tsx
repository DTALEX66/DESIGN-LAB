import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Animate the hierarchy, not just the layer.
 *
 * "Layer": the whole container slides in as one block.
 * "Hierarchy": each card enters on a stagger, THEN its text fades in on a second,
 * longer stagger — so the eye reads structure (cards) then detail (text). Same UI,
 * but the second version feels intentional. Toggle + replay to compare.
 */
const EASE = [0.23, 1, 0.32, 1] as const // ease-out-expo: elegant, decelerating

const CARDS = [
  { c: 'linear-gradient(150deg,#3b82f6,#2563eb)', title: 'Design review', sub: 'Today · 2:00 PM' },
  { c: 'linear-gradient(150deg,#fb7185,#e11d48)', title: 'Ship the build', sub: 'Tomorrow · 9:00 AM' },
  { c: 'linear-gradient(150deg,#34d399,#059669)', title: 'Team sync', sub: 'Thursday · 11:30 AM' },
]

export function AnimateHierarchy() {
  const reduce = useReducedMotion()
  const [mode, setMode] = useState<'layer' | 'hierarchy'>('hierarchy')
  const [run, setRun] = useState(0) // remount key to replay

  const replay = (m: 'layer' | 'hierarchy') => {
    setMode(m)
    setRun((r) => r + 1)
  }

  return (
    <>
      <style>{`
        .ah-wrap{ width:300px; display:flex; flex-direction:column; gap:14px;
          font-family:ui-sans-serif,system-ui,sans-serif; color:#18181b; }
        .ah-seg{ display:flex; gap:2px; background:#eaeaec; padding:3px; border-radius:11px; align-self:center; }
        .ah-seg button{ appearance:none; border:0; background:transparent; font:inherit; font-size:12.5px;
          font-weight:560; color:#71717a; padding:6px 14px; border-radius:8px; cursor:pointer; }
        .ah-seg button.on{ background:#fff; color:#18181b; box-shadow:0 1px 2px rgba(24,24,27,.12); }
        .ah-stack{ display:flex; flex-direction:column; gap:8px; min-height:188px; overflow:hidden; }
        .ah-card{ display:flex; align-items:center; gap:11px; background:#fff;
          border:1px solid #e7e7ea; border-radius:14px; padding:11px 13px;
          box-shadow:0 1px 2px rgba(24,24,27,.05), 0 8px 20px -14px rgba(24,24,27,.3); }
        .ah-icon{ flex:0 0 auto; width:34px; height:34px; border-radius:10px;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.35); }
        .ah-title{ font-size:13.5px; font-weight:640; letter-spacing:-.01em; }
        .ah-sub{ font-size:11.5px; color:#71717a; margin-top:1px; }
      `}</style>

      <div className="ah-wrap">
        <div className="ah-seg" role="tablist">
          <button className={mode === 'hierarchy' ? 'on' : ''} onClick={() => replay('hierarchy')}>Hierarchy</button>
          <button className={mode === 'layer' ? 'on' : ''} onClick={() => replay('layer')}>Layer</button>
        </div>

        <div className="ah-stack" key={`${mode}-${run}`}>
          {mode === 'layer' ? (
            // the whole group moves as one block
            <motion.div
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 120 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={reduce ? { duration: 0.2 } : { duration: 0.62, ease: EASE }}
            >
              {CARDS.map((card) => (
                <Card key={card.title} card={card} />
              ))}
            </motion.div>
          ) : (
            // each card on a stagger; its text on a second, longer stagger
            CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                className="ah-card"
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 120 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                transition={reduce ? { duration: 0.2 } : { duration: 0.62, ease: EASE, delay: i * 0.07 }}
              >
                <span className="ah-icon" style={{ background: card.c }} />
                <div>
                  <motion.div
                    className="ah-title"
                    initial={reduce ? { opacity: 0 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={reduce ? { duration: 0.2 } : { duration: 0.4, delay: 0.22 + i * 0.13 }}
                  >
                    {card.title}
                  </motion.div>
                  <motion.div
                    className="ah-sub"
                    initial={reduce ? { opacity: 0 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={reduce ? { duration: 0.2 } : { duration: 0.4, delay: 0.3 + i * 0.13 }}
                  >
                    {card.sub}
                  </motion.div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

function Card({ card }: { card: (typeof CARDS)[number] }) {
  return (
    <div className="ah-card">
      <span className="ah-icon" style={{ background: card.c }} />
      <div>
        <div className="ah-title">{card.title}</div>
        <div className="ah-sub">{card.sub}</div>
      </div>
    </div>
  )
}
