# springy-motion

A Claude Code / agent skill for designing and implementing **beautiful, springy, physically-grounded motion** across web (Motion / Framer Motion + CSS/WAAPI) and native (SwiftUI). It both **builds** animations and **reviews** existing ones.

```bash
npx skills add OtherdaysStudio/springy-motion
```

That installs the skill into your project (or `~/.claude/skills/` for global use). Claude picks it up automatically the next session, or invoke it as `/springy-motion`.

## What it does

Give it a motion task and it reaches for the right technique instead of guessing:

- **Spring transitions, pop-in entrances, sheets / trays / drawers, shared-element morphs** — physically grounded, interruptible, reduced-motion aware.
- **Gestures** — swipe-to-dismiss, drag-to-reorder, rubber-band overscroll, momentum with 1:1 tracking before threshold.
- **Micro-interactions** — press/hover/tap feedback, number tickers, hold-to-confirm, direction-aware tabs/routes, text morphs, staggers.
- **Review mode** — paste in an animation that "feels off / janky / not premium" and it runs a critique rubric (perf, continuity, interruptibility, frequency, a11y) and returns concrete fixes.

## The core idea: one perceptual spring, every platform

Every spring is parameterized by **`(duration, bounce)`** — a perceptual model that ports cleanly across:

- **Motion (web):** `visualDuration` + `bounce`
- **SwiftUI:** `.spring(duration:bounce:)`
- **CSS:** a generated `linear()` easing

Five tuned presets — **Snap** (0.2/0), **Glide** (0.5/0), **Pop** (0.4/0.4), **Lively** (0.45/0.5), **Track** (0.35/0.18, gesture release) — tuned empirically in the gallery, not guessed.

> Note: the WWDC23 damping formula that circulates online is garbled. The correct conversion is `damping = 4π(1−bounce)/duration`, `stiffness = (2π/duration)²`, `ζ = 1−bounce` — verified against Apple's published values.

## What's inside

```
skills/springy-motion/
├── SKILL.md                  # the hub: rules engine, preset table, reference map
├── SOURCES.md                # credits to the source essays (read them)
├── references/               # the knowledge base
│   ├── principles.md         # the motion philosophy + hard-won rules
│   ├── spring-system.md      # the (duration, bounce) model + presets
│   ├── easing.md             # easing curves, when to use which
│   ├── gestures.md           # interruptible gestures, momentum, thresholds
│   ├── timing.md             # verified perceptual thresholds (Nielsen/Doherty/RAIL…)
│   ├── recipes-web.md        # Motion + CSS recipes (morphing, proximity, carousels…)
│   ├── recipes-swiftui.md    # SwiftUI recipes
│   ├── review-checklist.md   # the critique rubric for review mode
│   └── accessibility-perf.md # reduced motion, GPU, backdrop-blur-on-scroll
├── examples/
│   ├── gallery/              # Vite + React + Motion demo gallery
│   └── swiftui/              # SwiftUI spring presets + filmstrip harness
└── assets/                   # verification screenshots
```

## Run the demo gallery

The gallery is the runnable proof — Dynamic Island, wallet stack, a send flow, a proximity dock, hold-to-confirm, springy toggles, and more, plus a spring-verification filmstrip.

```bash
cd skills/springy-motion/examples/gallery
npm install
npm run dev
```

SwiftUI examples run standalone on macOS (no simulator):

```bash
cd skills/springy-motion/examples/swiftui
swift SpringFilmstrip.swift
```

## Credits

This skill synthesizes three essays — read them, they're the soul of the craft. Full credits and foundational references are in [`skills/springy-motion/SOURCES.md`](skills/springy-motion/SOURCES.md):

- **Animation Vocabulary** — Emil Kowalski · <https://animations.dev/vocabulary>
- **Family Values** — Benji · <https://benji.org/family-values>
- **Invisible Details of Interaction Design** — Rauno Freiberg · <https://rauno.me/craft/interaction-design>

The essays themselves are not redistributed here — only linked.

## License

[MIT](LICENSE) © Otherdays Studio. Covers the skill's code and documentation; the linked source essays remain the property of their authors.
