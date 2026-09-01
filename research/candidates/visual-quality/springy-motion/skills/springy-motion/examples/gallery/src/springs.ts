import { genSpring } from './genSpring'

/**
 * Signature spring presets — parameterized by perceptual DURATION + BOUNCE.
 * One (duration, bounce) intent → Motion, SwiftUI, and CSS linear() (generated).
 * Numbers seeded from the verified knowledge base §5; tuned empirically here.
 */

export type Preset = {
  key: string
  name: string
  feel: string
  duration: number // perceptual seconds
  bounce: number // 0 = no overshoot … higher = bouncier
  motion: string // Motion transition (display)
  swiftui: string // SwiftUI modifier (display)
  use: string
  // generated:
  linear: string
  durationMs: number
}

const SPECS: Omit<Preset, 'linear' | 'durationMs'>[] = [
  {
    key: 'snap',
    name: 'Snap',
    feel: 'instant, crisp, zero overshoot',
    duration: 0.2,
    bounce: 0,
    motion: `{ type: 'spring', visualDuration: 0.2, bounce: 0 }`,
    swiftui: `.snappy(duration: 0.2, extraBounce: 0)`,
    use: 'press feedback, toggles, selection, high-frequency / keyboard',
  },
  {
    key: 'glide',
    name: 'Glide',
    feel: 'smooth, calm, no overshoot',
    duration: 0.5,
    bounce: 0,
    motion: `{ type: 'spring', visualDuration: 0.5, bounce: 0 }`,
    swiftui: `.smooth(duration: 0.5)`,
    use: 'sheets, routes, modals, large surfaces — default A→B',
  },
  {
    key: 'pop',
    name: 'Pop',
    feel: 'snappy with a satisfying overshoot',
    duration: 0.4,
    bounce: 0.4,
    motion: `{ type: 'spring', visualDuration: 0.4, bounce: 0.4 }`,
    swiftui: `.spring(duration: 0.4, bounce: 0.4)`,
    use: 'pop-in entrances, success checks, confirm morphs — default delight',
  },
  {
    key: 'lively',
    name: 'Lively',
    feel: 'bouncier, playful, clear overshoot',
    duration: 0.45,
    bounce: 0.5,
    motion: `{ type: 'spring', visualDuration: 0.45, bounce: 0.5 }`,
    swiftui: `.spring(duration: 0.45, bounce: 0.5)`,
    use: 'confetti, FAB expand, onboarding flourish — the delight peak (rare)',
  },
  {
    key: 'track',
    name: 'Track',
    feel: 'finger-tight; settle with carried velocity on release',
    duration: 0.35,
    bounce: 0.18,
    motion: `release: { type: 'spring', visualDuration: 0.35, bounce: 0.18 }`,
    swiftui: `.interactiveSpring while dragging; .spring(duration: 0.35, bounce: 0.18) on release`,
    use: 'swipe-to-dismiss, drawers, drag-to-reorder, rubber-band',
  },
]

export const PRESETS: Record<string, Preset> = Object.fromEntries(
  SPECS.map((s) => {
    const g = genSpring({ duration: s.duration, bounce: s.bounce })
    return [s.key, { ...s, linear: g.linear, durationMs: g.durationMs }]
  }),
) as Record<string, Preset>

export const PRESET_LIST = Object.values(PRESETS)

/** Motion transition for a preset, driven by the same perceptual (duration, bounce). */
export const spring = (key: keyof typeof PRESETS) =>
  ({ type: 'spring', visualDuration: PRESETS[key].duration, bounce: PRESETS[key].bounce }) as const
