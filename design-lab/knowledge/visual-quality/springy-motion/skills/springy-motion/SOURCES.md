# Sources & Credits

This skill synthesizes three essays into a practical, cross-platform motion system. Read them; they are the soul of the craft.

## Primary sources (the soul)

1. **Animation Vocabulary** — Emil Kowalski · <https://animations.dev/vocabulary>
   The precise lexicon: spring parameters (stiffness/damping/mass, bounce, perceptual duration), easing rules (ease-out for UI, asymmetric feels alive), momentum / velocity / interruptibility, and the meta-principles (purposeful, frequency-of-use, spatial consistency, reduced motion). See also his course *Animations on the Web* (animations.dev) and essay *Great Animations* (<https://emilkowal.ski/ui/great-animations>).

2. **Family Values** — Benji (Benjamin Mayo et al.) · <https://benji.org/family-values>
   The philosophy behind the Family wallet: **simplicity** (gradual revelation, the dynamic tray system), **fluidity** ("we fly instead of teleport," continuity over teleport, shared-element travel, the Con→Confirm text morph, no redundant animation), and **delight** (the Delight–Impact Curve: delight ∝ 1/frequency; selective emphasis; consistent polish everywhere).

3. **Invisible Details of Interaction Design** — Rauno Freiberg · <https://rauno.me/craft/interaction-design>
   The interaction physics: real-world metaphors, momentum & angle retention, trigger-during-swipe vs trigger-on-release (lightweight vs destructive), immediate 1:1 responsiveness then animate past threshold (never naive 0→1), spatial consistency (animate from origin), frequency & novelty (don't animate high-frequency keyboard actions), touch content visibility, implicit input, Fitts's Law.

## Foundational references

- Apple — *Designing Fluid Interfaces*, WWDC 2018 · <https://developer.apple.com/videos/play/wwdc2018/803/>
- Apple — *Animate with springs*, WWDC 2023 · <https://developer.apple.com/videos/play/wwdc2023/10158/>
- Apple — Human Interface Guidelines: *Motion* · <https://developer.apple.com/design/human-interface-guidelines/motion>
- Motion (web) docs · <https://motion.dev/docs>
- MDN — `linear()` easing, Web Animations API, `@starting-style`, View Transitions · <https://developer.mozilla.org/>

## Library targets

- **Web:** [Motion](https://motion.dev) (`motion`, successor to Framer Motion) + CSS / Web Animations API.
- **Native:** SwiftUI springs (iOS 17+ / macOS 14+).

The full verified API reference distilled from these sources lives in `references/`.
