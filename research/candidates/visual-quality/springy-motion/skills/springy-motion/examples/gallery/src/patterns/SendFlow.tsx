import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import type { Transition, Variants } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

type Step = 'amount' | 'review' | 'sending' | 'success'
const ORDER: Record<Step, number> = { amount: 0, review: 1, sending: 2, success: 3 }

const RECIPIENT = 'Alex'
const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '·', '0', 'del'] as const
type Key = (typeof PAD)[number]

/* ---- formatting: cents-based, commas shift in as the number grows ---- */
function format(cents: number): string {
  const dollars = Math.floor(cents / 100)
  const frac = cents % 100
  const whole = dollars.toLocaleString('en-US')
  return frac > 0 ? `${whole}.${String(frac).padStart(2, '0')}` : whole
}

/* Content swap: a quick scale + fade IN PLACE. The box itself springs to hug the
   new content's height — so there's no horizontal slide and nothing "shuffles". */
const contentV: Variants = {
  enter: { opacity: 0, scale: 0.96 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
}
const contentVReduced: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
}

/* The morphing suffix of the primary button label (after the shared "Con"). */
const suffixV: Variants = {
  enter: { y: '70%', opacity: 0 },
  center: { y: '0%', opacity: 1 },
  exit: { y: '-70%', opacity: 0 },
}

const CONFETTI = [
  { x: -46, y: -30, r: -40, c: '#2563eb', d: 0.0 },
  { x: -22, y: -52, r: 30, c: '#16a34a', d: 0.04 },
  { x: 8, y: -58, r: -18, c: '#f59e0b', d: 0.02 },
  { x: 34, y: -46, r: 44, c: '#ef4444', d: 0.06 },
  { x: 50, y: -22, r: -30, c: '#a5b4fc', d: 0.03 },
  { x: -40, y: -8, r: 22, c: '#16a34a', d: 0.08 },
  { x: 44, y: 4, r: -52, c: '#2563eb', d: 0.05 },
  { x: -8, y: -64, r: 12, c: '#f59e0b', d: 0.07 },
] as const

export function SendFlow() {
  const reduce = useReducedMotion()
  const [step, setStep] = useState<Step>('amount')
  const [cents, setCents] = useState<number>(0)
  const trayRef = useRef<HTMLDivElement>(null)
  const [trayH, setTrayH] = useState<number | 'auto'>('auto')

  const display = useMemo(() => format(cents), [cents])
  const hasAmount = cents > 0

  /* The big amount value, shared across every step — same string, springs on change. */
  const Amount = useCallback(
    ({ size }: { size: number }) => (
      <span className="snd-amount" style={{ fontSize: size }}>
        <span className="snd-cur" style={{ fontSize: size * 0.52 }}>
          $
        </span>
        <motion.span
          key={cents}
          className="snd-amount-num"
          initial={reduce ? false : { scale: 0.86, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduce ? { duration: 0 } : spring.snap}
        >
          {display}
        </motion.span>
      </span>
    ),
    [cents, display, reduce],
  )

  const press = useCallback((k: Key) => {
    if (k === '·') return
    setCents((c) => {
      if (k === 'del') return Math.floor(c / 10)
      const next = c * 10 + Number(k)
      return next > 99_999_999 ? c : next // cap at $999,999.99
    })
  }, [])

  const go = useCallback((to: Step) => setStep(to), [])

  const confirm = useCallback(() => {
    go('sending')
    window.setTimeout(() => go('success'), 1050)
  }, [go])

  const reset = useCallback(() => {
    setStep('amount')
    setCents(0)
  }, [])

  const stepKey = step === 'sending' ? 'review' : step
  // Measure the active step so the box springs to HUG its height. Animating height
  // directly (not Motion `layout`) avoids the scale-distortion that warps content.
  useLayoutEffect(() => {
    if (trayRef.current) setTrayH(trayRef.current.offsetHeight)
  }, [stepKey, reduce])

  // Quick, springy hug for the box; quick scale+fade for the content.
  const hugSpring: Transition = reduce ? { duration: 0 } : { type: 'spring', visualDuration: 0.36, bounce: 0.2 }
  const contentT: Transition = reduce ? { duration: 0.16 } : { type: 'spring', visualDuration: 0.3, bounce: 0.08 }
  const variants = reduce ? contentVReduced : contentV

  return (
    <>
      <style>{`
        .snd-card{
          width:320px; box-sizing:border-box;
          font-family:ui-sans-serif,system-ui,sans-serif;
          color:#18181b; background:#fff;
          border:1px solid #e7e7ea; border-radius:24px;
          box-shadow:0 1px 2px rgba(24,24,27,.06),0 12px 40px -16px rgba(24,24,27,.3);
          overflow:hidden; font-variant-numeric:tabular-nums;
        }
        .snd-tray{ position:relative; overflow:hidden; }
        .snd-stepwrap{ position:relative; }
        .snd-step{ padding:18px 18px 18px; }

        /* progress dots */
        .snd-dots{
          display:flex; gap:5px; justify-content:center;
          padding:14px 0 2px;
        }
        .snd-dot{
          width:6px; height:6px; border-radius:999px; background:#e7e7ea;
        }
        .snd-dot.is-on{ background:#2563eb; }
        .snd-dot.is-done{ background:#16a34a; }

        /* AMOUNT */
        .snd-label{
          font-size:12px; font-weight:600; letter-spacing:.02em;
          text-transform:uppercase; color:#a1a1aa; text-align:center;
          margin:2px 0 10px;
        }
        .snd-amount{
          display:inline-flex; align-items:flex-start; justify-content:center;
          font-weight:700; letter-spacing:-.035em; line-height:1;
          color:#18181b; white-space:nowrap;
        }
        .snd-cur{ font-weight:600; color:#a1a1aa; margin:.06em .04em 0 0; }
        .snd-amount.is-zero{ color:#d4d4d8; }
        .snd-amount.is-zero .snd-cur{ color:#e4e4e7; }
        .snd-amount-num{ display:inline-block; transform-origin:50% 60%; }
        .snd-amountRow{
          display:flex; align-items:center; justify-content:center;
          min-height:54px; margin-bottom:14px;
        }

        .snd-pad{
          display:grid; grid-template-columns:repeat(3,1fr);
          gap:6px;
        }
        .snd-key{
          appearance:none; border:0; background:#fafafa;
          font:inherit; font-size:19px; font-weight:600; color:#18181b;
          letter-spacing:-.01em;
          height:46px; border-radius:14px; cursor:pointer;
          display:grid; place-items:center;
          box-shadow:0 1px 2px rgba(24,24,27,.05);
          -webkit-tap-highlight-color:transparent; user-select:none;
        }
        .snd-key.is-ghost{ background:transparent; box-shadow:none; cursor:default; }
        .snd-key.is-del{ color:#71717a; }
        .snd-key svg{ display:block; }

        /* REVIEW */
        .snd-review{ display:flex; flex-direction:column; align-items:center; }
        .snd-avatar{
          width:54px; height:54px; border-radius:999px;
          display:grid; place-items:center; color:#fff; font-weight:700; font-size:20px;
          letter-spacing:-.02em;
          background:linear-gradient(140deg,#2563eb,#7c9cf6);
          box-shadow:0 6px 18px -8px rgba(37,99,235,.7);
          margin-bottom:12px;
        }
        .snd-to{
          font-size:13px; color:#71717a; letter-spacing:-.01em; margin-bottom:2px;
        }
        .snd-name{ font-size:15px; font-weight:650; color:#18181b; letter-spacing:-.01em; }
        .snd-bigamt{ margin:12px 0 4px; }

        /* SUCCESS */
        .snd-success{ display:flex; flex-direction:column; align-items:center; }
        .snd-checkwrap{ position:relative; margin:6px 0 12px; }
        .snd-check{
          width:62px; height:62px; border-radius:999px;
          display:grid; place-items:center; color:#fff;
          background:linear-gradient(140deg,#16a34a,#22c55e);
          box-shadow:0 8px 22px -8px rgba(22,163,74,.8);
        }
        .snd-confetti{ position:absolute; inset:0; pointer-events:none; }
        .snd-bit{
          position:absolute; left:50%; top:50%;
          width:7px; height:7px; border-radius:2px; margin:-3.5px;
        }
        .snd-sent{ font-size:13px; color:#71717a; letter-spacing:-.01em; margin-top:2px; }
        .snd-sub{ font-size:12px; color:#a1a1aa; margin-top:4px; letter-spacing:-.005em; }

        /* CTA / button */
        .snd-foot{ padding:2px 18px 18px; }
        .snd-cta{
          position:relative; appearance:none; border:0; cursor:pointer;
          width:100%; height:48px; border-radius:16px;
          font:inherit; font-size:15px; font-weight:650; letter-spacing:-.01em;
          color:#fff; background:#2563eb;
          box-shadow:0 1px 2px rgba(24,24,27,.10),0 10px 24px -10px rgba(37,99,235,.75);
          overflow:hidden;
          display:flex; align-items:center; justify-content:center;
          -webkit-tap-highlight-color:transparent;
        }
        .snd-cta::before{
          content:""; position:absolute; inset:0; pointer-events:none;
          background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 46%);
        }
        .snd-cta.is-disabled{
          background:#e7e7ea; color:#a1a1aa; cursor:default;
          box-shadow:0 1px 2px rgba(24,24,27,.05);
        }
        .snd-cta.is-success{ background:#16a34a; box-shadow:0 10px 24px -10px rgba(22,163,74,.75); }
        .snd-cta-inner{
          position:relative; z-index:1;
          display:inline-flex; align-items:baseline;
        }
        /* "Con" stays fixed; the suffix morphs in a clipped track */
        .snd-suffix{
          position:relative; display:inline-block;
          height:1.1em; overflow:hidden; vertical-align:baseline;
        }
        .snd-suffix > span{ display:inline-block; white-space:nowrap; }
        .snd-suffix-ghost{ visibility:hidden; display:inline-block; }

        .snd-spinner{
          width:20px; height:20px; border-radius:999px;
          border:2.5px solid rgba(255,255,255,.35); border-top-color:#fff;
        }

        /* back chevron */
        .snd-back{
          appearance:none; border:0; background:transparent; cursor:pointer;
          position:absolute; left:12px; top:12px; z-index:3;
          width:30px; height:30px; border-radius:999px;
          display:grid; place-items:center; color:#71717a;
          -webkit-tap-highlight-color:transparent;
        }
        .snd-back:hover{ background:#f4f4f5; color:#18181b; }
        .snd-back svg{ display:block; }

        .snd-hint{
          text-align:center; font-size:11px; color:#a1a1aa;
          letter-spacing:-.005em; padding:0 18px 14px;
        }
      `}</style>

      <div className="snd-card">
        {/* progress dots */}
        <div className="snd-dots" aria-hidden="true">
          {(['amount', 'review', 'success'] as const).map((s) => {
            const idx = s === 'success' ? 2 : ORDER[s]
            const cur = step === 'sending' ? 2 : ORDER[step]
            const on = cur === idx
            const done = cur > idx
            return (
              <motion.span
                key={s}
                className={'snd-dot' + (on ? ' is-on' : '') + (done ? ' is-done' : '')}
                animate={reduce ? undefined : { scale: on ? 1.25 : 1 }}
                transition={spring.pop}
              />
            )
          })}
        </div>

        {/* the TRAY — its height SPRINGS to hug the active step's content */}
        <div className="snd-tray">
          {/* back chevron only on review */}
          <AnimatePresence>
            {step === 'review' && (
              <motion.button
                type="button"
                className="snd-back"
                aria-label="Back"
                onClick={() => go('amount')}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
                transition={spring.snap}
                whileTap={reduce ? undefined : { scale: 0.9 }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 3.5 5.5 8l4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>

          <motion.div
            className="snd-stepwrap"
            initial={false}
            animate={{ height: trayH }}
            transition={hugSpring}
            style={{ overflow: 'hidden' }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                ref={trayRef}
                key={stepKey}
                className="snd-step"
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={contentT}
              >
                {step === 'amount' && (
                  <>
                    <div className="snd-label">Send amount</div>
                    <div className="snd-amountRow">
                      <span className={'snd-amount' + (hasAmount ? '' : ' is-zero')}>
                        <span className="snd-cur" style={{ fontSize: 22 }}>
                          $
                        </span>
                        <motion.span
                          key={cents}
                          className="snd-amount-num"
                          style={{ fontSize: 44 }}
                          initial={reduce ? false : { scale: 0.86, opacity: 0.45 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={reduce ? { duration: 0 } : spring.snap}
                        >
                          {display}
                        </motion.span>
                      </span>
                    </div>

                    <div className="snd-pad">
                      {PAD.map((k) => {
                        if (k === '·')
                          return <span key="ghost" className="snd-key is-ghost" aria-hidden="true" />
                        const isDel = k === 'del'
                        return (
                          <motion.button
                            key={k}
                            type="button"
                            className={'snd-key' + (isDel ? ' is-del' : '')}
                            onClick={() => press(k)}
                            whileHover={
                              reduce ? undefined : { scale: 1.03, backgroundColor: '#f2f2f3' }
                            }
                            whileTap={reduce ? undefined : { scale: 0.92 }}
                            transition={spring.snap}
                            aria-label={isDel ? 'Delete' : k}
                          >
                            {isDel ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Z"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="m12.5 9.5 4 4m0-4-4 4"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : (
                              k
                            )}
                          </motion.button>
                        )
                      })}
                    </div>
                  </>
                )}

                {(step === 'review' || step === 'sending') && (
                  <div className="snd-review">
                    <motion.div
                      className="snd-avatar"
                      layout
                      initial={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                      animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                      transition={spring.pop}
                    >
                      {RECIPIENT[0]}
                    </motion.div>
                    <div className="snd-to">Sending to</div>
                    <div className="snd-name">{RECIPIENT}</div>
                    <div className="snd-bigamt">
                      <Amount size={40} />
                    </div>
                  </div>
                )}

                {step === 'success' && (
                  <div className="snd-success">
                    <div className="snd-checkwrap">
                      {!reduce && (
                        <span className="snd-confetti" aria-hidden="true">
                          {CONFETTI.map((b, i) => (
                            <motion.span
                              key={i}
                              className="snd-bit"
                              style={{ background: b.c }}
                              initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
                              animate={{
                                x: b.x,
                                y: b.y,
                                scale: [0, 1, 1, 0.9],
                                opacity: [0, 1, 1, 0],
                                rotate: b.r,
                              }}
                              transition={{
                                duration: 0.9,
                                delay: 0.08 + b.d,
                                ease: 'easeOut',
                                times: [0, 0.25, 0.7, 1],
                              }}
                            />
                          ))}
                        </span>
                      )}
                      <motion.div
                        className="snd-check"
                        layout
                        initial={reduce ? { opacity: 0 } : { scale: 0, rotate: -25 }}
                        animate={reduce ? { opacity: 1 } : { scale: 1, rotate: 0 }}
                        transition={reduce ? { duration: 0 } : spring.lively}
                      >
                        <motion.svg
                          width="30"
                          height="30"
                          viewBox="0 0 24 24"
                          fill="none"
                          initial={reduce ? false : { pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={reduce ? { duration: 0 } : { ...spring.glide, delay: 0.12 }}
                        >
                          <motion.path
                            d="M6 12.5 10.2 16.5 18 7.5"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={reduce ? false : { pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={
                              reduce ? { duration: 0 } : { ...spring.glide, delay: 0.12 }
                            }
                          />
                        </motion.svg>
                      </motion.div>
                    </div>
                    <div className="snd-sent">Sent</div>
                    <div className="snd-bigamt">
                      <Amount size={36} />
                    </div>
                    <div className="snd-sub">to {RECIPIENT} · just now</div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* FOOTER button — label morphs Continue → Confirm → ⟳ → Done */}
        <div className="snd-foot">
          <PrimaryButton
            step={step}
            disabled={!hasAmount && step === 'amount'}
            reduce={!!reduce}
            onAdvance={() => go('review')}
            onConfirm={confirm}
            onReset={reset}
          />
        </div>

        <div className="snd-hint">
          {step === 'amount'
            ? hasAmount
              ? 'Tap Continue to review'
              : 'Tap the keypad to enter an amount'
            : step === 'review'
              ? 'Confirm to send · ← to edit'
              : step === 'sending'
                ? 'Sending…'
                : 'Tap Done to start over'}
        </div>
      </div>
    </>
  )
}

/* ---------- Primary button: the signature Family text morph ---------- */
function PrimaryButton({
  step,
  disabled,
  reduce,
  onAdvance,
  onConfirm,
  onReset,
}: {
  step: Step
  disabled: boolean
  reduce: boolean
  onAdvance: () => void
  onConfirm: () => void
  onReset: () => void
}) {
  const sending = step === 'sending'
  const success = step === 'success'

  // suffix after the shared "Con" prefix, or a special token for non-Con states
  const suffix = step === 'amount' ? 'tinue' : step === 'review' ? 'firm' : null

  const onClick = () => {
    if (disabled || sending) return
    if (step === 'amount') onAdvance()
    else if (step === 'review') onConfirm()
    else if (step === 'success') onReset()
  }

  return (
    <LayoutGroup>
      <motion.button
        type="button"
        className={
          'snd-cta' + (disabled ? ' is-disabled' : '') + (success ? ' is-success' : '')
        }
        onClick={onClick}
        layout
        disabled={disabled || sending}
        whileHover={reduce || disabled || sending ? undefined : { y: -1, scale: 1.01 }}
        whileTap={reduce || disabled || sending ? undefined : { scale: 0.975 }}
        transition={spring.snap}
        aria-live="polite"
      >
        <AnimatePresence mode="wait" initial={false}>
          {sending ? (
            <motion.span
              key="sending"
              className="snd-cta-inner"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              transition={spring.snap}
            >
              {reduce ? (
                'Sending…'
              ) : (
                <motion.span
                  className="snd-spinner"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, ease: 'linear', duration: 0.7 }}
                />
              )}
            </motion.span>
          ) : success ? (
            <motion.span
              key="done"
              className="snd-cta-inner"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={spring.glide}
            >
              Done
            </motion.span>
          ) : (
            /* amount + review share the fixed "Con" — only the suffix morphs */
            <motion.span
              key="con"
              className="snd-cta-inner"
              initial={reduce ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={spring.snap}
            >
              <span>Con</span>
              {reduce ? (
                <span style={{ display: 'inline-block' }}>{suffix}</span>
              ) : (
                <span className="snd-suffix">
                  {/* ghost holds the widest width so the button doesn't jiggle mid-morph */}
                  <span className="snd-suffix-ghost">tinue</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={suffix}
                      style={{ position: 'absolute', left: 0, top: 0 }}
                      variants={suffixV}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={spring.glide}
                    >
                      {suffix}
                    </motion.span>
                  </AnimatePresence>
                </span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </LayoutGroup>
  )
}
