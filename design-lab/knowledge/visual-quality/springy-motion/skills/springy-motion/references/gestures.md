# Gestures — motion as a conversation

A gesture is the one place the user holds the spring in their hand. Get it right and the surface feels physical; get it wrong and it feels like a button that lies. This file is the implementation layer for the five gesture laws in `principles.md`. The presets live in `spring-system.md`; the *why* lives in `principles.md`. This is the *how*, both platforms, with verified APIs.

**Track is the home preset for every gesture** (`spring-system.md`): `duration 0.35, bounce 0.18`. During the drag you bind 1:1; on release you hand off to Track to settle, seeded with the finger's velocity.

---

## The five laws, restated

From `principles.md` (gesture laws A–E). Memorize these before you touch a recipe.

| Law | Rule | What it forbids |
|---|---|---|
| **A. Respond 1:1, immediately** | The element tracks the finger from the first pixel, proportionally. Past a threshold a spring can complete the move. | A naive `0 → 1` tween that only fires after a threshold — zero feedback during the drag. |
| **B. Trigger by consequence** | Lightweight/reversible actions (peek a panel, reveal search) fire **during** the gesture once elements reach position. Destructive/committing actions (dismiss, delete, send) fire **on release** only. | Committing mid-swipe. "It wouldn't feel nice if it dismissed mid-swipe." |
| **C. Preserve momentum + angle** | A flicked element keeps the velocity *and direction* it was thrown with. The settle spring carries that velocity in. | Reset-and-replay: snapping to 0 velocity, then animating a fresh curve. |
| **D. Always interruptible** | An animation in flight is redirectable at any moment, no need to finish first. Re-target by injecting current velocity. | The iOS Settings panel that blocks swipe-back until the open animation finishes. |
| **E. Resist at boundaries** | Dragging past an edge meets increasing resistance and springs back — rubber-banding. | A hard stop at the edge. |

Every law below maps to a concrete API. If a recipe violates one, it's wrong even if it compiles.

---

## Motion (web)

### The drag API — verified defaults

From KB §1.6. These are the knobs; the defaults are the house behavior, so only override with intent.

| Prop | Default | Use |
|---|---|---|
| `drag` | `false` | `true` (both axes), `"x"`, `"y"`. |
| `dragConstraints` | — | `{ top, left, right, bottom }` in px, or a `ref`. |
| `dragElastic` | `0.5` | Rubber-band past constraints (law E). `0` = hard stop, `1` = full follow. |
| `dragMomentum` | `true` | Inertia/throw after release (law C). |
| `dragDirectionLock` | `false` | Lock to the first axis dragged. |
| `dragSnapToOrigin` | `false` | Animate back to origin on release. |

Handlers `onDragStart` / `onDrag` / `onDragEnd` receive `(event, info)` where `info = { point, delta, offset, velocity }`. `velocity` is `{ x, y }` in px/s and feeds both the inertia throw and any physics spring you hand off to.

**Inertia throw — `dragTransition` defaults** (KB §1.6):

| Option | Default | Use |
|---|---|---|
| `power` | `0.8` | Higher = the throw lands further. |
| `timeConstant` | `700` | Deceleration constant (ms). |
| `modifyTarget` | — | `(target: number) => number` — e.g. snap to a grid or page. |
| `min` / `max` | — | Boundaries; overshoot springs back. |
| `bounceStiffness` | `500` | Boundary bounce-back stiffness. |
| `bounceDamping` | `10` | Boundary bounce-back damping. |

`{ power: 0.8, timeConstant: 700 }` are the Motion inertia defaults — that's Track's throw. Leave them unless a surface needs a shorter, snappier land (then drop `power` and `timeConstant` together).

### 1:1 binding — `useMotionValue`

Law A means the element follows the finger before any spring exists. Bind a `MotionValue` to the drag offset and read derived values off it — no React re-render per frame.

```tsx
import { motion, useMotionValue, useTransform, animate } from "motion/react"

function SwipeToDismiss({ onDismiss }: { onDismiss: () => void }) {
  const x = useMotionValue(0)                              // law A: 1:1 with the finger
  const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0])
  const VELOCITY_THRESHOLD = 0.4                            // vaul: fling dismiss (px/ms)
  const CLOSE_THRESHOLD = 0.25                              // vaul: drag 25% + release

  return (
    <motion.div
      drag="x"
      style={{ x, opacity }}
      dragElastic={0.5}                                     // law E: rubber-band
      onDragEnd={(_, info) => {
        const flung = Math.abs(info.velocity.x) > VELOCITY_THRESHOLD * 1000   // px/s
        const dragged = Math.abs(info.offset.x) > window.innerWidth * CLOSE_THRESHOLD
        if (flung || dragged) {
          // law B: destructive — commit ON RELEASE, not mid-swipe
          const dir = (info.offset.x || info.velocity.x) > 0 ? 1 : -1
          animate(x, dir * window.innerWidth, {
            type: "spring", visualDuration: 0.35, bounce: 0.18,   // Track settle
            velocity: info.velocity.x,                            // law C: carry momentum
          }).then(onDismiss)
        } else {
          // didn't pass threshold: snap home, still seeded with velocity
          animate(x, 0, { type: "spring", visualDuration: 0.35, bounce: 0.18, velocity: info.velocity.x })
        }
      }}
    />
  )
}
```

Note `info.velocity.x` passed straight into `animate(...)` as `velocity` — that's law C in one line. The throw and the settle share the finger's speed, so there's no reset-and-replay.

### Draggable sheet

A sheet is law A + law B (lightweight reveal can settle to an open detent during the drag; full dismiss commits on release) + law E at the top edge.

```tsx
function Sheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const y = useMotionValue(0)
  const CLOSE_THRESHOLD = 0.25
  const VELOCITY_THRESHOLD = 0.4

  return (
    <motion.div
      drag="y"
      style={{ y }}
      dragConstraints={{ top: 0, bottom: 0 }}   // can't drag above the top; bottom handled on release
      dragElastic={0.5}                          // law E: pull-up resists, springs back
      onDragEnd={(_, info) => {
        const sheetHeight = window.innerHeight * 0.9
        const flung = info.velocity.y > VELOCITY_THRESHOLD * 1000
        const dragged = info.offset.y > sheetHeight * CLOSE_THRESHOLD
        animate(y, flung || dragged ? sheetHeight : 0, {
          type: "spring", visualDuration: 0.35, bounce: 0.18,
          velocity: info.velocity.y,             // law C
        }).then(() => { if (flung || dragged) onClose() })
      }}
    />
  )
}
```

### Commit thresholds — vaul, authority-verified

These are the numbers vaul ships (KB §6 authority-verified constants). Use them as defaults; they're tuned for real sheets.

| Constant | Value | Meaning |
|---|---|---|
| `VELOCITY_THRESHOLD` | `0.4` | A fling above this (px/ms) dismisses regardless of distance. |
| `CLOSE_THRESHOLD` | `0.25` | Drag past 25% of the surface, then release, to dismiss. |

Either condition commits. Fast fling *or* far drag — that's how a sheet feels forgiving. vaul's matching drawer curve is `cubic-bezier(0.32, 0.72, 0, 1)` (the only authority-authored bezier in this skill) for the non-gestural open/close — but the *gestural* settle uses Track with carried velocity, never a static curve.

---

## SwiftUI

### 1:1 during the drag, spring on release

From KB §2.5 and §2.9. While the finger is down, follow it directly in `.onChanged` (or `.updating`). On `.onEnded`, read `value.velocity` and `value.predictedEndTranslation` to seed momentum, then hand off to Track.

- **While dragging:** `.interactiveSpring(response: 0.15, dampingFraction: 0.86)` — verified defaults (KB §2.5). Low response = stiff = tracks the finger. Each interactive spring replaces its successor while **preserving velocity** (law D).
- **On release:** `.spring(duration: 0.35, bounce: 0.18)` — Track settle. A `.spring(...)` replaces other springs on the same property and carries velocity automatically (KB §2.9), so the hand-off is continuous.

`DragGesture.Value` gives you (KB §2.9): `translation`, `velocity` (`CGSize`, points/s — available iOS 13+/macOS 10.15+), `predictedEndTranslation`, `predictedEndLocation`. Use `velocity` / `predictedEnd*` to seed the settle.

### Swipe-to-dismiss, seeded with velocity

```swift
struct SwipeToDismiss: View {
    @State private var offset: CGFloat = 0
    let onDismiss: () -> Void

    private let dismissDistance: CGFloat = 120        // CLOSE_THRESHOLD-style cutoff
    private let flingVelocity: CGFloat = 400          // pts/s — fling dismiss

    var body: some View {
        CardContent()
            .offset(x: offset)
            .opacity(Double(1 - min(abs(offset) / 200, 1)))
            .gesture(
                DragGesture()
                    .onChanged { value in
                        // law A: 1:1 with the finger, no threshold
                        withAnimation(.interactiveSpring(response: 0.15, dampingFraction: 0.86)) {
                            offset = value.translation.width
                        }
                    }
                    .onEnded { value in
                        // law B: destructive — decide ON RELEASE
                        let v = value.velocity.width                       // pts/s
                        let predicted = value.predictedEndTranslation.width // law C input
                        let shouldDismiss = abs(value.translation.width) > dismissDistance
                            || abs(v) > flingVelocity
                            || abs(predicted) > 250

                        if shouldDismiss {
                            let dir: CGFloat = (value.translation.width + v) > 0 ? 1 : -1
                            // law C: settle carries the gesture's velocity automatically
                            withAnimation(.spring(duration: 0.35, bounce: 0.18)) {
                                offset = dir * 600
                            }
                            onDismiss()
                        } else {
                            withAnimation(.spring(duration: 0.35, bounce: 0.18)) {
                                offset = 0                                  // snap home
                            }
                        }
                    }
            )
    }
}
```

The two-spring pattern — `.interactiveSpring` in `.onChanged`, `.spring` in `.onEnded` — is the whole game. SwiftUI auto-tracks the gesture velocity across the swap, so the release never resets to zero (law C, law D).

### Rubber-band at boundaries

SwiftUI has no `dragElastic`. Apply a resistance curve yourself when the drag exceeds a bound, then spring back (law E):

```swift
.onChanged { value in
    let raw = value.translation.height
    // past the top edge, resist: each extra point moves the sheet less
    let resisted = raw < 0 ? -log10(1 - raw / 60) * 60 : raw
    offset = resisted
}
.onEnded { _ in
    withAnimation(.spring(duration: 0.35, bounce: 0.18)) { offset = 0 }
}
```

---

## Velocity transfer — why springs, never CSS, mid-gesture

KB §4.5. This is the physical core of laws C and D.

- A **spring accepts `initialVelocity`.** Mid-flight re-targeting uses the *current* velocity as the new initial velocity → the redirect is smooth. SwiftUI auto-tracks gesture velocity; Motion's physics `velocity` defaults to the value's current velocity. This is what makes interruption (law D) and momentum (law C) free.
- A **tween is a prespecified curve with no initial velocity.** Interrupt it and the element jerks to a halt.
- **CSS `linear()` is a static curve → no velocity transfer.** It cannot carry the finger's speed into the settle.

| Engine | Carries gesture velocity | Use mid-gesture? |
|---|---|---|
| Motion spring / inertia | Yes (auto, or pass `velocity`) | Yes |
| SwiftUI `.spring` / `.interactiveSpring` | Yes (auto) | Yes |
| CSS `linear()` / `transition` | **No** | **Never** |

**Rule:** never use CSS for the *active* part of a drag or its momentum settle. CSS `linear()` is fine for a non-gestural open/close (`spring-system.md` generates one per preset), but the moment a finger is driving the motion, you need Motion or SwiftUI so velocity hands off. The Track preset in `spring-system.md` says the same thing — it's the one preset that must carry velocity.

---

## Touch content visibility

From `principles.md` (deeper ideas). When the finger covers the thing it's manipulating, the user is flying blind. Two rules:

1. **Render a proxy under an occluding finger.** Surface a magnified or offset copy of what's hidden — the iOS caret loupe, an enlarged key on a keyboard, a value bubble floating above a slider thumb. The proxy lives outside the finger's shadow so the user sees the result of their own drag.
2. **Don't cancel a drag when the finger leaves the target.** Once a drag starts, it owns the pointer until release. A slider that drops the gesture because the finger drifted off the track feels broken. Track the touch point globally, not the element's hit area (KB §6 principle 23).

A draggable value control (slider, stepper, scrubber) without a proxy bubble is unfinished. Add the bubble above the thumb, offset up by the finger's radius, and keep it pinned to the value — not the finger's exact x.

---

## Checklist before you ship a gesture

- Does it track 1:1 from the first pixel, with no threshold gate on feedback? (law A)
- Do destructive actions commit only on release? (law B)
- Does the settle spring receive the gesture's velocity? (law C — `velocity` in Motion, automatic in SwiftUI)
- Can you redirect it mid-flight without it finishing first? (law D)
- Does dragging past an edge resist and spring back? (law E — `dragElastic: 0.5` / a resistance curve)
- Is the active motion driven by Motion/SwiftUI, never a CSS curve?
- If a finger occludes the target, is there a proxy?

If any answer is no, it's not done — fix that one before adding anything new.
