import { useState } from 'react'

/**
 * Textareas that grow with content — `field-sizing: content`.
 *
 * No nested scrollbar, no JS height-syncing: the field sizes to its text. Smoother
 * to write in and the form stays scannable. (Falls back to a normal textarea where
 * field-sizing isn't supported — Chrome/Edge 123+, Safari TP; Firefox behind a flag.)
 */
export function GrowTextarea() {
  const [grow, setGrow] = useState(
    'This textarea grows with its content — no inner scrollbar.\nTry adding a few more lines…',
  )
  const [fixed, setFixed] = useState(
    'This one is a fixed height, so long content scrolls inside it. Keep typing and you lose the shape of the field.',
  )

  return (
    <>
      <style>{`
        .gt-wrap{ width:300px; display:flex; flex-direction:column; gap:16px;
          font-family:ui-sans-serif,system-ui,sans-serif; color:#18181b; }
        .gt-field label{ display:block; font-size:11.5px; font-weight:600; letter-spacing:.02em;
          text-transform:uppercase; color:#a1a1aa; margin-bottom:6px; }
        .gt-area{ width:100%; box-sizing:border-box; resize:none;
          font:inherit; font-size:14px; line-height:1.45; color:#18181b;
          background:#fff; border:1px solid #e7e7ea; border-radius:12px; padding:11px 13px;
          box-shadow:0 1px 2px rgba(24,24,27,.05); outline:none;
          transition:border-color .15s ease, box-shadow .15s ease; }
        .gt-area:focus{ border-color:#c3d4fb; box-shadow:0 0 0 3px rgba(37,99,235,.14); }
        /* the whole point: size to content, with sane bounds */
        .gt-grow{ field-sizing:content; min-height:2.9em; max-height:200px; }
        .gt-fixed{ height:64px; overflow:auto; }
        .gt-tag{ font-size:11px; color:#71717a; margin-top:5px; }
        .gt-tag code{ font-family:ui-monospace,monospace; font-size:11px; color:#2563eb;
          background:#f1f5ff; padding:1px 5px; border-radius:5px; }
      `}</style>

      <div className="gt-wrap">
        <div className="gt-field">
          <label htmlFor="gt-grow">Grows with content</label>
          <textarea
            id="gt-grow"
            className="gt-area gt-grow"
            value={grow}
            onChange={(e) => setGrow(e.target.value)}
          />
          <div className="gt-tag">
            <code>field-sizing: content</code> — the field hugs the text
          </div>
        </div>

        <div className="gt-field">
          <label htmlFor="gt-fixed">Fixed height (scrolls)</label>
          <textarea
            id="gt-fixed"
            className="gt-area gt-fixed"
            value={fixed}
            onChange={(e) => setFixed(e.target.value)}
          />
          <div className="gt-tag">nested scroll — harder to scan</div>
        </div>
      </div>
    </>
  )
}
