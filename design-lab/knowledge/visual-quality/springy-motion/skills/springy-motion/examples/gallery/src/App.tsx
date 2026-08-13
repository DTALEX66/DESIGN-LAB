import { useState } from 'react'
import { DEMOS } from './demos'
import { PATTERNS, SHOWCASE } from './patterns'
import { Verify } from './Verify'

type Tab = 'showcase' | 'patterns' | 'interactions' | 'springs'

const CARDS = { showcase: SHOWCASE, patterns: PATTERNS, interactions: DEMOS }

export function App() {
  const [tab, setTab] = useState<Tab>('showcase')
  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>springy-motion</h1>
          <p>Beautiful, physically-grounded motion. One (duration, bounce) → Motion, SwiftUI, CSS.</p>
        </div>
        <nav className="nav">
          <button className={tab === 'showcase' ? 'on' : ''} onClick={() => setTab('showcase')}>
            Showcase
          </button>
          <button className={tab === 'patterns' ? 'on' : ''} onClick={() => setTab('patterns')}>
            Patterns
          </button>
          <button className={tab === 'interactions' ? 'on' : ''} onClick={() => setTab('interactions')}>
            Primitives
          </button>
          <button className={tab === 'springs' ? 'on' : ''} onClick={() => setTab('springs')}>
            Springs
          </button>
        </nav>
      </header>

      {tab === 'springs' ? (
        <Verify />
      ) : (
        <div className={tab === 'showcase' ? 'gallery showcase' : 'gallery'}>
          {CARDS[tab].map(({ title, note, Comp }) => (
            <section className="card" key={title}>
              <div className="card-head">
                <h3>{title}</h3>
                <span>{note}</span>
              </div>
              <div className="card-body">
                <Comp />
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
