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

// Seven burst dots, fixed angles for an even radial spray.
const BURST = Array.from({ length: 7 }, (_, i) => {
  const angle = (i / 7) * Math.PI * 2 - Math.PI / 2
  return { id: i, x: Math.cos(angle), y: Math.sin(angle) }
})

const dotVariants: Variants = {
  hidden: { opacity: 0, scale: 0, x: 0, y: 0 },
  burst: (d: { x: number; y: number }) => ({
    opacity: [0, 1, 0],
    scale: [0, 1, 0.2],
    x: d.x * 26,
    y: d.y * 26,
    transition: { ...spring.track, opacity: { duration: 0.5, times: [0, 0.25, 1] } },
  }),
}

const digitVariants: Variants = {
  enter: { y: '0%', opacity: 1 },
  initial: { y: '110%', opacity: 0 },
  exit: { y: '-110%', opacity: 0 },
}

export function LikeButton() {
  const reduce = useReducedMotion()
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(128)
  // bumped on each LIKE so a fresh burst mounts every time
  const [burstKey, setBurstKey] = useState(0)

  const toggle = () => {
    setLiked((prev) => {
      const next = !prev
      setCount((c) => c + (next ? 1 : -1))
      if (next) setBurstKey((k) => k + 1)
      return next
    })
  }

  return (
    <>
      <style>{`
        .like-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          font-family: ui-sans-serif, system-ui, sans-serif;
        }
        .like-btn {
          position: relative;
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border: 1px solid #e7e7ea;
          background: #fff;
          border-radius: 14px;
          cursor: pointer;
          padding: 0;
          box-shadow: 0 1px 2px rgba(24,24,27,.06), 0 8px 24px -12px rgba(24,24,27,.18);
          -webkit-tap-highlight-color: transparent;
          transition: border-color .25s ease, box-shadow .25s ease;
        }
        .like-btn:hover { border-color: #d8d8dd; }
        .like-btn:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }
        .like-heart {
          width: 40px;
          height: 40px;
          display: block;
          position: relative;
          z-index: 1;
        }
        .like-burst {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          pointer-events: none;
          z-index: 0;
        }
        .like-dot {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
        }
        .like-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1;
        }
        .like-count {
          position: relative;
          display: inline-block;
          font-size: 20px;
          font-weight: 600;
          color: #18181b;
          font-variant-numeric: tabular-nums;
          height: 24px;
          overflow: hidden;
        }
        .like-count-roll {
          display: inline-block;
        }
        .like-label {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 500;
          color: #71717a;
        }
      `}</style>

      <div className="like-wrap">
        <motion.button
          type="button"
          className="like-btn"
          onClick={toggle}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike' : 'Like'}
          whileHover={reduce ? undefined : { scale: 1.08 }}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          transition={spring.snap}
        >
          {!reduce && (
            <AnimatePresence>
              {liked && (
                <span className="like-burst" key={burstKey}>
                  {BURST.map((d) => (
                    <motion.span
                      key={d.id}
                      className="like-dot"
                      custom={d}
                      variants={dotVariants}
                      initial="hidden"
                      animate="burst"
                    />
                  ))}
                </span>
              )}
            </AnimatePresence>
          )}

          <motion.svg
            className="like-heart"
            viewBox="0 0 24 24"
            initial={false}
            animate={{
              scale: reduce ? 1 : liked ? [1, 1.28, 1] : 1,
            }}
            transition={liked ? spring.lively : spring.snap}
          >
            <motion.path
              d="M12 20.5l-1.32-1.2C6 15.06 3 12.36 3 9.02 3 6.32 5.12 4.2 7.82 4.2c1.52 0 2.98.71 3.93 1.83l.25.29.25-.29A5.21 5.21 0 0 1 16.18 4.2C18.88 4.2 21 6.32 21 9.02c0 3.34-3 6.04-7.68 10.29L12 20.5z"
              initial={false}
              animate={{
                fill: liked ? '#ef4444' : '#fff',
                stroke: liked ? '#ef4444' : '#a1a1aa',
              }}
              strokeWidth={1.6}
              strokeLinejoin="round"
              transition={{ duration: reduce ? 0 : 0.28, ease: 'easeOut' }}
            />
          </motion.svg>
        </motion.button>

        <div className="like-meta">
          <span className="like-count" aria-live="polite">
            {reduce ? (
              <span className="like-count-roll">{count}</span>
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  className="like-count-roll"
                  key={count}
                  variants={digitVariants}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                  transition={spring.snap}
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            )}
          </span>
          <span className="like-label">{liked ? 'Liked' : 'Likes'}</span>
        </div>
      </div>
    </>
  )
}
