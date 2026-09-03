import { useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import type { PanInfo, Transition, Variants } from 'motion/react'

const spring = {
  snap: { type: 'spring', visualDuration: 0.2, bounce: 0 },
  glide: { type: 'spring', visualDuration: 0.5, bounce: 0 },
  pop: { type: 'spring', visualDuration: 0.4, bounce: 0.4 },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5 },
  track: { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const

type CardId = 'indigo' | 'rose' | 'emerald' | 'amber'

type Card = {
  id: CardId
  brand: string
  digits: string
  holder: string
  /** card face gradient */
  face: string
  /** subtle inner sheen overlay */
  sheen: string
  /** chip gradient */
  chip: string
}

type Txn = { id: string; merchant: string; sub: string; amount: string; positive?: boolean }

const CARDS: Card[] = [
  {
    id: 'indigo',
    brand: 'Visa',
    digits: '4821',
    holder: 'A. MORGAN',
    face: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 46%,#8b5cf6 100%)',
    sheen: 'linear-gradient(135deg,rgba(255,255,255,.34),rgba(255,255,255,0) 42%)',
    chip: 'linear-gradient(135deg,#fde68a,#f59e0b)',
  },
  {
    id: 'rose',
    brand: 'Mastercard',
    digits: '9037',
    holder: 'A. MORGAN',
    face: 'linear-gradient(135deg,#e11d48 0%,#f43f5e 48%,#fb7185 100%)',
    sheen: 'linear-gradient(135deg,rgba(255,255,255,.32),rgba(255,255,255,0) 44%)',
    chip: 'linear-gradient(135deg,#fef3c7,#fbbf24)',
  },
  {
    id: 'emerald',
    brand: 'Amex',
    digits: '5512',
    holder: 'A. MORGAN',
    face: 'linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%)',
    sheen: 'linear-gradient(135deg,rgba(255,255,255,.30),rgba(255,255,255,0) 44%)',
    chip: 'linear-gradient(135deg,#fef9c3,#eab308)',
  },
  {
    id: 'amber',
    brand: 'Visa',
    digits: '6680',
    holder: 'A. MORGAN',
    face: 'linear-gradient(135deg,#d97706 0%,#f59e0b 48%,#fbbf24 100%)',
    sheen: 'linear-gradient(135deg,rgba(255,255,255,.36),rgba(255,255,255,0) 42%)',
    chip: 'linear-gradient(135deg,#fff7ed,#fb923c)',
  },
]

const TXNS: Record<CardId, Txn[]> = {
  indigo: [
    { id: 'i1', merchant: 'Blue Bottle', sub: 'Coffee · Today', amount: '-$5.40' },
    { id: 'i2', merchant: 'Spotify', sub: 'Music · Yesterday', amount: '-$10.99' },
    { id: 'i3', merchant: 'Refund — Uber', sub: 'Travel · Mon', amount: '+$12.30', positive: true },
  ],
  rose: [
    { id: 'r1', merchant: 'Whole Foods', sub: 'Grocery · Today', amount: '-$48.12' },
    { id: 'r2', merchant: 'Apple', sub: 'iCloud+ · Wed', amount: '-$2.99' },
    { id: 'r3', merchant: 'Payroll', sub: 'Income · Fri', amount: '+$2,140.00', positive: true },
  ],
  emerald: [
    { id: 'e1', merchant: 'Delta Air', sub: 'Travel · Today', amount: '-$312.00' },
    { id: 'e2', merchant: 'Hertz', sub: 'Car · Tue', amount: '-$74.50' },
    { id: 'e3', merchant: 'Cashback', sub: 'Reward · Tue', amount: '+$6.24', positive: true },
  ],
  amber: [
    { id: 'a1', merchant: 'Shell', sub: 'Fuel · Today', amount: '-$61.20' },
    { id: 'a2', merchant: 'Netflix', sub: 'Streaming · Sun', amount: '-$15.49' },
    { id: 'a3', merchant: 'Transfer', sub: 'Move · Sun', amount: '+$200.00', positive: true },
  ],
}

const PREFIX = 'wal-'

/* vertical pitch between fanned rows, and per-card depth offset when stacked */
const ROW = 56
const STACK_DY = 28
const STACK_DSCALE = 0.05

/* transactions stagger in (Pop). custom = row index */
const txnV: Variants = {
  hidden: (i: number) => ({ opacity: 0, y: 14, scale: 0.96, transition: { delay: i * 0.04 } }),
  show: (i: number) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: 0.06 + i * 0.06 } }),
  out: { opacity: 0, y: 8, scale: 0.97 },
}

export function WalletStack() {
  const reduce = useReducedMotion()
  const [fanned, setFanned] = useState(false)
  const [selected, setSelected] = useState<CardId | null>(null)

  const selCard = selected ? CARDS.find((c) => c.id === selected) ?? null : null

  /* spring used for the card position/shape morphs */
  const cardT: Transition = reduce ? { duration: 0.001 } : spring.glide

  return (
    <>
      <style>{`
        .${PREFIX}root{
          width:312px; box-sizing:border-box;
          font-family:ui-sans-serif,system-ui,sans-serif;
          color:#18181b;
          -webkit-font-smoothing:antialiased;
          font-variant-numeric:tabular-nums;
        }
        .${PREFIX}shell{
          position:relative; box-sizing:border-box;
          width:100%;
          background:#fafafa;
          border:1px solid #e7e7ea; border-radius:24px;
          box-shadow:0 1px 2px rgba(24,24,27,.06),0 12px 40px -16px rgba(24,24,27,.3);
          padding:16px 16px 14px;
          overflow:hidden;
        }

        /* ---- header ---- */
        .${PREFIX}head{
          display:flex; align-items:center; gap:9px;
          padding:2px 2px 12px;
        }
        .${PREFIX}title{
          font-size:14px; font-weight:700; letter-spacing:-.02em; color:#18181b;
          display:flex; align-items:center; gap:7px;
        }
        .${PREFIX}dot{
          width:7px; height:7px; border-radius:999px; background:#2563eb;
          box-shadow:0 0 0 3px rgba(37,99,235,.14);
        }
        .${PREFIX}spacer{ flex:1; }
        .${PREFIX}ctrl{
          appearance:none; border:1px solid #e7e7ea; background:#fff;
          font:inherit; font-size:11.5px; font-weight:650; letter-spacing:-.01em;
          color:#18181b; padding:5px 10px; border-radius:999px; cursor:pointer;
          display:inline-flex; align-items:center; gap:5px;
          box-shadow:0 1px 2px rgba(24,24,27,.05);
          white-space:nowrap;
        }
        .${PREFIX}ctrl svg{ display:block; }
        .${PREFIX}ctrl:disabled{ opacity:.4; cursor:default; }

        /* ---- stage ---- */
        .${PREFIX}stage{
          position:relative;
          width:100%;
        }

        /* a single card face */
        .${PREFIX}card{
          position:absolute; left:0; top:0;
          width:280px; height:172px;
          /* the stage is 280 wide centered */
          border-radius:18px;
          color:#fff;
          cursor:pointer;
          box-sizing:border-box;
          overflow:hidden;
          will-change:transform;
          -webkit-tap-highlight-color:transparent;
          user-select:none;
        }
        .${PREFIX}cardInner{
          position:absolute; inset:0;
          padding:16px 18px;
          display:flex; flex-direction:column;
        }
        .${PREFIX}sheen{
          position:absolute; inset:0; pointer-events:none;
          mix-blend-mode:screen;
        }
        .${PREFIX}gloss{
          position:absolute; left:-40%; top:-120%;
          width:60%; height:340%;
          background:linear-gradient(105deg,rgba(255,255,255,0),rgba(255,255,255,.5),rgba(255,255,255,0));
          transform:rotate(8deg);
          pointer-events:none; opacity:.0;
        }
        .${PREFIX}row1{
          display:flex; align-items:center; justify-content:space-between;
        }
        .${PREFIX}brand{
          font-size:13.5px; font-weight:750; letter-spacing:.01em;
          text-shadow:0 1px 1px rgba(0,0,0,.18);
        }
        .${PREFIX}contact{
          width:18px; height:18px; opacity:.85;
        }
        .${PREFIX}chip{
          width:34px; height:25px; border-radius:7px;
          margin-top:14px;
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.4),inset 0 -3px 5px rgba(0,0,0,.12);
          position:relative; overflow:hidden;
        }
        .${PREFIX}chip::before{
          content:""; position:absolute; inset:6px 4px;
          border-radius:3px;
          background:
            linear-gradient(0deg,rgba(0,0,0,.18),rgba(0,0,0,.18)) center/100% 1px no-repeat,
            linear-gradient(90deg,rgba(0,0,0,.16),rgba(0,0,0,.16)) center/1px 100% no-repeat;
        }
        .${PREFIX}num{
          margin-top:auto;
          font-size:15px; font-weight:600; letter-spacing:.14em;
          font-variant-numeric:tabular-nums;
          text-shadow:0 1px 1px rgba(0,0,0,.18);
          display:flex; align-items:center; gap:8px;
        }
        .${PREFIX}numDots{ letter-spacing:.06em; opacity:.92; font-weight:700; }
        .${PREFIX}foot{
          display:flex; align-items:flex-end; justify-content:space-between;
          margin-top:7px;
        }
        .${PREFIX}holder{
          font-size:10.5px; font-weight:650; letter-spacing:.08em; opacity:.94;
          text-shadow:0 1px 1px rgba(0,0,0,.18);
        }
        .${PREFIX}flag{
          font-size:14px; font-weight:800; font-style:italic; letter-spacing:-.02em;
          opacity:.95; text-shadow:0 1px 1px rgba(0,0,0,.2);
        }

        .${PREFIX}hint{
          position:absolute; left:0; right:0; bottom:0;
          text-align:center; font-size:11.5px; color:#71717a; letter-spacing:-.01em;
          display:flex; align-items:center; justify-content:center; gap:6px;
        }
        .${PREFIX}hint b{ color:#18181b; font-weight:650; }
        .${PREFIX}kbd{
          display:inline-grid; place-items:center;
          width:15px; height:15px; border-radius:5px;
          background:#fff; border:1px solid #e7e7ea;
          box-shadow:0 1px 1px rgba(24,24,27,.05);
        }

        /* ---- detail panel ---- */
        .${PREFIX}detail{
          position:absolute; left:0; right:0; top:0;
          display:flex; flex-direction:column; gap:9px;
          padding-top:188px; /* leaves room for the expanded card */
        }
        .${PREFIX}txn{
          display:flex; align-items:center; gap:11px;
          background:#fff; border:1px solid #e7e7ea; border-radius:14px;
          padding:9px 11px;
          box-shadow:0 1px 2px rgba(24,24,27,.04);
        }
        .${PREFIX}tIcon{
          flex:0 0 auto; width:32px; height:32px; border-radius:10px;
          display:grid; place-items:center; color:#fff;
          font-size:13px; font-weight:750;
        }
        .${PREFIX}tBody{ display:flex; flex-direction:column; min-width:0; flex:1; }
        .${PREFIX}tName{
          font-size:12.5px; font-weight:650; letter-spacing:-.01em; color:#18181b;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .${PREFIX}tSub{ font-size:11px; color:#71717a; letter-spacing:-.005em; }
        .${PREFIX}tAmt{
          font-size:12.5px; font-weight:700; letter-spacing:-.01em; color:#18181b;
          font-variant-numeric:tabular-nums; white-space:nowrap;
        }
        .${PREFIX}tAmt.${PREFIX}pos{ color:#16a34a; }

        .${PREFIX}backHint{
          margin-top:2px; text-align:center;
          font-size:11px; color:#71717a; letter-spacing:-.01em;
        }

        @media (prefers-reduced-motion: reduce){
          .${PREFIX}card{ will-change:auto; }
        }
      `}</style>

      <div className={`${PREFIX}root`} role="group" aria-label="Wallet">
        <div className={`${PREFIX}shell`}>
          {/* header / controls */}
          <div className={`${PREFIX}head`}>
            <div className={`${PREFIX}title`}>
              <span className={`${PREFIX}dot`} aria-hidden />
              Wallet
            </div>
            <div className={`${PREFIX}spacer`} />
            <AnimatePresence mode="popLayout" initial={false}>
              {selected ? (
                <motion.button
                  key="back"
                  type="button"
                  className={`${PREFIX}ctrl`}
                  onClick={() => setSelected(null)}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: 8 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: 8 }}
                  transition={spring.snap}
                  whileHover={reduce ? undefined : { y: -1, scale: 1.03 }}
                  whileTap={reduce ? undefined : { scale: 0.95 }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M7.2 2.5 3.6 6l3.6 3.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back
                </motion.button>
              ) : (
                <motion.button
                  key="toggle"
                  type="button"
                  className={`${PREFIX}ctrl`}
                  onClick={() => setFanned((f) => !f)}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: 8 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: 8 }}
                  transition={spring.snap}
                  whileHover={reduce ? undefined : { y: -1, scale: 1.03 }}
                  whileTap={reduce ? undefined : { scale: 0.95 }}
                >
                  <motion.svg
                    width="11"
                    height="11"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden
                    animate={{ rotate: fanned ? 180 : 0 }}
                    transition={spring.snap}
                  >
                    <path
                      d="M2.5 4.5 6 8l3.5-3.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                  {fanned ? 'Collapse' : 'Browse'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* stage — its height morphs with state via layout */}
          <LayoutGroup>
            <motion.div
              className={`${PREFIX}stage`}
              initial={false}
              transition={cardT}
              animate={{
                height: selected
                  ? 188 + TXNS[selected].length * 50 + 30
                  : fanned
                    ? (CARDS.length - 1) * ROW + 172 + 26
                    : 172 + (CARDS.length - 1) * STACK_DY + 26,
              }}
            >
              {CARDS.map((card, i) => {
                const isSel = selected === card.id
                const dim = selected != null && !isSel

                /* Resting transform per state.
                   stacked: overlap downward, back cards smaller + dimmer.
                   fanned: spread into a vertical list.
                   selected: this card rises to top & expands; others tuck away. */
                const depthFromTop = i // 0 = front
                const stackY = depthFromTop * STACK_DY
                const stackScale = 1 - depthFromTop * STACK_DSCALE

                const target = selected
                  ? isSel
                    ? { x: 0, y: 0, scale: 1, opacity: 1 }
                    : { x: 0, y: -26, scale: 0.9, opacity: 0 }
                  : fanned
                    ? { x: 0, y: i * ROW, scale: 1, opacity: 1 }
                    : { x: 0, y: stackY, scale: stackScale, opacity: 1 }

                /* z-order: selected on top; otherwise front card on top */
                const z = isSel ? 50 : selected ? 0 : CARDS.length - i

                /* shadow deepens as a card sits "in front" */
                const lift = isSel
                  ? '0 24px 50px -18px rgba(24,24,27,.45),0 4px 12px -6px rgba(24,24,27,.3)'
                  : fanned
                    ? '0 12px 28px -16px rgba(24,24,27,.45)'
                    : `0 ${10 + (CARDS.length - i) * 4}px ${22 + (CARDS.length - i) * 6}px -14px rgba(24,24,27,.5)`

                /* center the 280px card in the 312-16-16 = 280 inner width */
                return (
                  <motion.div
                    key={card.id}
                    className={`${PREFIX}card`}
                    role="button"
                    tabIndex={dim ? -1 : 0}
                    aria-label={`${card.brand} ending ${card.digits}`}
                    style={{ background: card.face, zIndex: z, boxShadow: lift }}
                    initial={false}
                    animate={
                      reduce
                        ? { opacity: target.opacity, x: 0, y: 0, scale: 1 }
                        : target
                    }
                    transition={{
                      ...cardT,
                      delay: reduce ? 0 : fanned && !selected ? i * 0.045 : 0,
                    }}
                    /* drag the front card when fanned (not in detail) */
                    drag={!reduce && fanned && !selected && i === 0 ? 'y' : false}
                    dragElastic={0.5}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragSnapToOrigin
                    dragTransition={{ bounceStiffness: 520, bounceDamping: 34 }}
                    whileDrag={{ scale: 1.03, cursor: 'grabbing' }}
                    whileHover={
                      reduce || selected
                        ? undefined
                        : { scale: (fanned ? 1 : stackScale) * 1.02 }
                    }
                    whileTap={reduce || isSel ? undefined : { scale: (fanned ? 1 : stackScale) * 0.985 }}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      if (selected) return
                      if (!fanned) {
                        setFanned(true)
                        return
                      }
                      setSelected(card.id)
                    }}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      if (selected) return
                      if (!fanned) setFanned(true)
                      else setSelected(card.id)
                    }}
                  >
                    <motion.div className={`${PREFIX}cardInner`}>
                      <div className={`${PREFIX}row1`}>
                        <span className={`${PREFIX}brand`}>{card.brand}</span>
                        <svg
                          className={`${PREFIX}contact`}
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M8 8a6 6 0 0 1 0 8M12 5a10 10 0 0 1 0 14M16 2a14 14 0 0 1 0 20"
                            stroke="rgba(255,255,255,.85)"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className={`${PREFIX}chip`} style={{ background: card.chip }} />
                      <div className={`${PREFIX}num`}>
                        <span className={`${PREFIX}numDots`}>••••</span>
                        <span className={`${PREFIX}numDots`}>••••</span>
                        <span className={`${PREFIX}numDots`}>••••</span>
                        <span>{card.digits}</span>
                      </div>
                      <div className={`${PREFIX}foot`}>
                        <span className={`${PREFIX}holder`}>{card.holder}</span>
                        <span className={`${PREFIX}flag`}>
                          {card.brand === 'Mastercard' ? 'MC' : card.brand === 'Amex' ? 'AX' : 'VISA'}
                        </span>
                      </div>
                    </motion.div>
                    <div className={`${PREFIX}sheen`} style={{ background: card.sheen }} aria-hidden />
                  </motion.div>
                )
              })}

              {/* hint — only in stacked, idle state */}
              <AnimatePresence>
                {!fanned && !selected && (
                  <motion.div
                    className={`${PREFIX}hint`}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    transition={{ ...spring.glide, delay: reduce ? 0 : 0.1 }}
                  >
                    <span className={`${PREFIX}kbd`} aria-hidden>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M6 2.5v5M3.5 5 6 7.5 8.5 5"
                          stroke="#71717a"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    Tap to <b>browse</b> your cards
                  </motion.div>
                )}
              </AnimatePresence>

              {/* detail — transactions list, staggers in */}
              <AnimatePresence mode="popLayout">
                {selCard && (
                  <motion.div
                    key="detail"
                    className={`${PREFIX}detail`}
                    initial={reduce ? { opacity: 0 } : { opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.12 } }}
                  >
                    {TXNS[selCard.id].map((t, i) => (
                      <motion.div
                        key={t.id}
                        className={`${PREFIX}txn`}
                        custom={i}
                        variants={txnV}
                        initial="hidden"
                        animate="show"
                        exit="out"
                        transition={reduce ? { duration: 0.15 } : spring.pop}
                      >
                        <span
                          className={`${PREFIX}tIcon`}
                          style={{ background: selCard.face }}
                          aria-hidden
                        >
                          {t.merchant.charAt(0)}
                        </span>
                        <span className={`${PREFIX}tBody`}>
                          <span className={`${PREFIX}tName`}>{t.merchant}</span>
                          <span className={`${PREFIX}tSub`}>{t.sub}</span>
                        </span>
                        <span
                          className={`${PREFIX}tAmt` + (t.positive ? ` ${PREFIX}pos` : '')}
                        >
                          {t.amount}
                        </span>
                      </motion.div>
                    ))}
                    <motion.div
                      className={`${PREFIX}backHint`}
                      variants={txnV}
                      custom={TXNS[selCard.id].length}
                      initial="hidden"
                      animate="show"
                      exit="out"
                      transition={reduce ? { duration: 0.15 } : spring.pop}
                    >
                      Tap <b>Back</b> to return to your cards
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </div>
      </div>
    </>
  )
}
