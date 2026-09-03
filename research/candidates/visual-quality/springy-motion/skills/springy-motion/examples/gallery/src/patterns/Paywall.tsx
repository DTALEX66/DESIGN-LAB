import { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

type Plan = 'monthly' | 'annual'

const PRICE: Record<Plan, number> = { monthly: 12, annual: 8 }
const FEATURES = ['Unlimited projects', 'Priority support', 'Advanced analytics'] as const

/* Each price digit slides up (new) / out (old). custom = +1 enter, -1 exit dir. */
const digitV: Variants = {
  initial: (dir: number) => ({ y: dir > 0 ? '-110%' : '110%', opacity: 0 }),
  show: { y: '0%', opacity: 1 },
  exit: (dir: number) => ({ y: dir > 0 ? '110%' : '-110%', opacity: 0 }),
}

export function Paywall() {
  const reduce = useReducedMotion()
  const [plan, setPlan] = useState<Plan>('monthly')
  const [ctaActive, setCtaActive] = useState(false)
  const annual = plan === 'annual'
  const price = PRICE[plan]
  // direction the digits travel: annual price is lower → roll down, monthly → roll up
  const dir = annual ? -1 : 1
  const digits = String(price).split('')

  return (
    <>
      <style>{`
        .pw-card{
          width:300px; box-sizing:border-box;
          font-family:ui-sans-serif,system-ui,sans-serif;
          color:#18181b; background:#fff;
          border:1px solid #e7e7ea; border-radius:16px;
          box-shadow:0 1px 2px rgba(24,24,27,.06),0 8px 24px -12px rgba(24,24,27,.18);
          overflow:hidden; font-variant-numeric:tabular-nums;
        }
        .pw-strip{
          height:4px;
          background:linear-gradient(90deg,#2563eb,#60a5fa 55%,#a5b4fc);
        }
        .pw-body{ padding:18px 18px 16px; }

        .pw-seg{
          position:relative; display:grid; grid-template-columns:1fr 1fr;
          background:#fafafa; border:1px solid #e7e7ea; border-radius:10px;
          padding:3px; gap:0;
        }
        .pw-seg-btn{
          position:relative; appearance:none; border:0; background:transparent;
          font:inherit; font-size:13px; font-weight:600; letter-spacing:-.01em;
          color:#71717a; padding:7px 0; border-radius:8px; cursor:pointer;
          transition:color .18s ease;
        }
        .pw-seg-btn.is-on{ color:#18181b; }
        .pw-seg-label{ position:relative; z-index:1; }
        .pw-pill{
          position:absolute; z-index:0; inset:0;
          background:#fff; border-radius:8px;
          box-shadow:0 1px 2px rgba(24,24,27,.08),0 1px 3px rgba(24,24,27,.06);
        }

        .pw-priceRow{
          display:flex; align-items:flex-end; gap:8px;
          margin:16px 0 14px; min-height:42px;
        }
        .pw-price{
          display:inline-flex; align-items:flex-end;
          font-size:38px; font-weight:700; line-height:1; letter-spacing:-.03em;
        }
        .pw-cur{ font-size:22px; font-weight:600; margin:0 1px 4px 0; color:#18181b; }
        .pw-digits{ display:inline-flex; }
        .pw-digit{
          position:relative; display:inline-block;
          width:.62ch; height:38px; overflow:hidden;
        }
        .pw-digit > span{
          position:absolute; left:0; top:0; display:inline-block;
        }
        .pw-per{
          font-size:13px; font-weight:500; color:#71717a;
          margin-bottom:5px; letter-spacing:-.01em;
        }
        .pw-badge{
          display:inline-flex; align-items:center;
          font-size:11px; font-weight:700; letter-spacing:.01em;
          color:#16a34a; background:rgba(22,163,74,.10);
          border:1px solid rgba(22,163,74,.22);
          padding:3px 7px; border-radius:999px; margin-bottom:7px;
          white-space:nowrap; transform-origin:left bottom;
        }

        .pw-feat{ display:flex; flex-direction:column; gap:9px; margin-bottom:16px; }
        .pw-feat-row{
          display:flex; align-items:center; gap:9px;
          font-size:13px; color:#18181b; letter-spacing:-.01em;
        }
        .pw-check{
          flex:0 0 auto; display:grid; place-items:center;
          width:18px; height:18px; border-radius:999px;
          background:rgba(37,99,235,.10); color:#2563eb;
        }
        .pw-check svg{ display:block; }

        .pw-cta{
          position:relative; appearance:none; border:0; cursor:pointer;
          width:100%; padding:11px 0; border-radius:11px;
          font:inherit; font-size:14px; font-weight:650; letter-spacing:-.01em;
          color:#fff; background:#2563eb;
          box-shadow:0 1px 2px rgba(24,24,27,.10),0 6px 16px -8px rgba(37,99,235,.7);
          overflow:hidden;
        }
        .pw-cta::before{
          content:""; position:absolute; inset:0;
          background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 46%);
          pointer-events:none;
        }
        .pw-cta-label{ position:relative; z-index:1; }
        .pw-note{
          text-align:center; font-size:11px; color:#71717a;
          margin:9px 0 0; letter-spacing:-.005em;
        }
      `}</style>

      <div className="pw-card">
        <div className="pw-strip" />
        <div className="pw-body">
          <LayoutGroup>
            <div className="pw-seg" role="tablist" aria-label="Billing period">
              {(['monthly', 'annual'] as const).map((p) => {
                const on = plan === p
                return (
                  <motion.button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    className={'pw-seg-btn' + (on ? ' is-on' : '')}
                    onClick={() => setPlan(p)}
                    whileHover={reduce ? undefined : { y: -1 }}
                    whileTap={reduce ? undefined : { scale: 0.97 }}
                    transition={spring.snap}
                  >
                    {on &&
                      (reduce ? (
                        <span className="pw-pill" />
                      ) : (
                        <motion.span layoutId="pwpill" className="pw-pill" transition={spring.snap} />
                      ))}
                    <span className="pw-seg-label">{p === 'monthly' ? 'Monthly' : 'Annual'}</span>
                  </motion.button>
                )
              })}
            </div>
          </LayoutGroup>

          <div className="pw-priceRow">
            <span className="pw-price">
              <span className="pw-cur">$</span>
              <span className="pw-digits">
                {reduce ? (
                  <span style={{ height: 38, display: 'inline-flex', alignItems: 'flex-end' }}>
                    {price}
                  </span>
                ) : (
                  digits.map((d, i) => (
                    <span className="pw-digit" key={i}>
                      <AnimatePresence initial={false} custom={dir} mode="popLayout">
                        <motion.span
                          key={d + '-' + plan}
                          custom={dir}
                          variants={digitV}
                          initial="initial"
                          animate="show"
                          exit="exit"
                          transition={spring.snap}
                        >
                          {d}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  ))
                )}
              </span>
            </span>
            <span className="pw-per">/mo</span>

            <span style={{ marginLeft: 'auto' }}>
              <AnimatePresence>
                {annual && (
                  <motion.span
                    className="pw-badge"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: -4 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: -3 }}
                    transition={reduce ? { duration: 0 } : spring.pop}
                  >
                    Save 33%
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </div>

          <div className="pw-feat">
            {FEATURES.map((f) => (
              <motion.div
                className="pw-feat-row"
                key={f}
                whileHover={reduce ? undefined : { x: 2 }}
                transition={spring.snap}
              >
                <span className="pw-check" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6.2 5 8.7l4.5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {f}
              </motion.div>
            ))}
          </div>

          <motion.button
            type="button"
            className="pw-cta"
            animate={
              reduce || ctaActive
                ? { scale: 1 }
                : { scale: [1, 1.012, 1] }
            }
            transition={
              reduce || ctaActive
                ? spring.snap
                : { duration: 2.6, ease: 'easeInOut', repeat: Infinity }
            }
            whileHover={reduce ? undefined : { scale: 1.02 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            onHoverStart={() => setCtaActive(true)}
            onHoverEnd={() => setCtaActive(false)}
            onTapStart={() => setCtaActive(true)}
            onTapCancel={() => setCtaActive(false)}
            onTap={() => setCtaActive(false)}
          >
            <span className="pw-cta-label">Start free trial</span>
          </motion.button>
          <p className="pw-note">Cancel anytime. No card required.</p>
        </div>
      </div>
    </>
  )
}
