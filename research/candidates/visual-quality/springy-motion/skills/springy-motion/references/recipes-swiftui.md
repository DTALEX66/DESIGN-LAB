# SwiftUI recipes (iOS 17+)

Copy-paste recipes for the most common springy moments in SwiftUI. Each one names *when* to use it, the preset it maps to (`spring-system.md`), a self-contained `View`, and the reduced-motion fallback. Read `principles.md` first — it tells you *whether* to animate; this file is *how*.

All snippets target **Swift 6 / iOS 17+** and use current APIs only: `.spring(duration:bounce:)`, the named springs (`.smooth`/`.snappy`/`.bouncy`), `.sensoryFeedback`, `matchedGeometryEffect`, `PhaseAnimator`, `.contentTransition(.numericText())`, and `@Environment(\.accessibilityReduceMotion)`. Do **not** use the legacy `interpolatingSpring(stiffness:damping:)` form — prefer the `(duration:bounce:)` springs.

## Preset → SwiftUI (from `spring-system.md`)

| Preset | SwiftUI animation | duration / bounce |
|---|---|---|
| **Snap** | `.snappy(duration: 0.2, extraBounce: 0)` or `.spring(duration: 0.2, bounce: 0)` | 0.2 / 0 |
| **Glide** | `.smooth(duration: 0.5)` (base bounce 0) | 0.5 / 0 |
| **Pop** | `.spring(duration: 0.4, bounce: 0.4)` | 0.4 / 0.4 |
| **Lively** | `.spring(duration: 0.45, bounce: 0.5)` | 0.45 / 0.5 |
| **Track** | `.interactiveSpring(response: 0.15, dampingFraction: 0.86)` while dragging; `.spring(duration: 0.35, bounce: 0.18)` on release | 0.35 / 0.18 |

## The reduced-motion rule

Read `@Environment(\.accessibilityReduceMotion)` and gate **kinetics**, not feedback. The fallback keeps the state change — it drops travel/scale/bounce for an opacity crossfade or instant change. Every recipe below ships one.

```swift
@Environment(\.accessibilityReduceMotion) private var reduceMotion
```

When `reduceMotion` is `true`: use `.smooth(duration: 0.2)` or `nil` (instant) instead of a bouncy spring, and never scale from below ~0.93. Pass `nil` to `withAnimation`/`.animation(_:value:)` to skip the animation entirely while keeping the value change.

---

## 1. Press feedback — scale 0.97 on press

**When:** buttons, cards, list rows. The most frequent interaction in the app, so keep it crisp and quiet. **Preset: Snap.** Add `.sensoryFeedback(.impact, trigger:)` for the physical tap.

A `ButtonStyle` is the right tool — `configuration.isPressed` drives the scale, and the style applies everywhere you use the button.

```swift
struct PressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(reduceMotion ? 1 : (configuration.isPressed ? 0.97 : 1))
            .animation(.snappy(duration: 0.2), value: configuration.isPressed)
    }
}

struct PressFeedbackView: View {
    @State private var taps = 0

    var body: some View {
        Button("Add to cart") { taps += 1 }
            .buttonStyle(PressStyle())
            .sensoryFeedback(.impact, trigger: taps)
    }
}
```

**Reduced motion:** the style above pins `scaleEffect` to `1` when `reduceMotion` is on, so the button reads as a normal control with no scale — the haptic still fires (it's functional feedback, not decoration).

---

## 2. Pop-in entrance — scale 0.93 → 1 + opacity 0 → 1

**When:** a card, badge, or toast appears for the first time. **Preset: Pop** (`.spring(duration: 0.4, bounce: 0.4)`). Start at scale **0.93, never 0** — scaling from zero looks like a balloon, not an arrival.

```swift
struct PopInView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    var body: some View {
        VStack {
            if shown {
                Label("Saved", systemImage: "checkmark.circle.fill")
                    .padding()
                    .background(.green.opacity(0.15), in: .capsule)
                    .transition(
                        reduceMotion
                            ? .opacity
                            : .scale(scale: 0.93).combined(with: .opacity)
                    )
            }
            Button("Show") { withAnimation(entrance) { shown.toggle() } }
        }
    }

    private var entrance: Animation {
        reduceMotion ? .smooth(duration: 0.2) : .spring(duration: 0.4, bounce: 0.4)
    }
}
```

**Reduced motion:** the transition collapses to `.opacity` and the spring becomes `.smooth(duration: 0.2)` — fade in, no scale, no bounce.

---

## 3. Sheet / tray

**When:** a modal surface slides up from the bottom; the user can drag it. **Preset: Glide** to present (`.smooth(duration: 0.5)`), **Track** while the finger is on it. Use `.presentationDetents` so the system handles the drag, snap, and rubber-band for you.

```swift
struct SheetView: View {
    @State private var showSheet = false

    var body: some View {
        Button("Open tray") { showSheet = true }
            .sheet(isPresented: $showSheet) {
                TrayContents()
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
    }
}

struct TrayContents: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Details").font(.headline)
            Text("System drives the drag, snap, and rubber-band.")
        }
        .padding()
    }
}
```

For a **custom** tray you drive yourself, track the drag 1:1 and settle on release:

```swift
.interactiveSpring(response: 0.15, dampingFraction: 0.86) // while dragging
.smooth(duration: 0.5)                                    // present / dismiss
.spring(duration: 0.35, bounce: 0.18)                     // release-settle (Track)
```

**Reduced motion:** prefer the system `.sheet` — it already honors Reduce Motion (cross-fade instead of slide). For a custom tray, gate the slide on `reduceMotion` and present with `.smooth(duration: 0.2)` or instant.

---

## 4. Shared-element morph — `matchedGeometryEffect`

**When:** a thumbnail expands into a detail view; the same element travels and grows instead of cross-fading into a copy. **Preset: Glide or Pop.** Needs a `@Namespace`.

```swift
struct SharedMorphView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var ns
    @State private var expanded = false

    var body: some View {
        ZStack {
            if expanded {
                RoundedRectangle(cornerRadius: 24)
                    .matchedGeometryEffect(id: "card", in: ns)
                    .frame(width: 320, height: 420)
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .matchedGeometryEffect(id: "card", in: ns)
                    .frame(width: 120, height: 120)
            }
        }
        .foregroundStyle(.blue.gradient)
        .onTapGesture { withAnimation(morph) { expanded.toggle() } }
    }

    private var morph: Animation {
        reduceMotion ? .smooth(duration: 0.2) : .spring(duration: 0.4, bounce: 0.4)
    }
}
```

**Reduced motion:** the element still travels (continuity matters), but with `.smooth(duration: 0.2)` — no bounce. If even the travel is too much for your surface, swap the two views with a plain `.opacity` transition instead.

> **Use `matchedGeometryEffect` only when the element's place genuinely changes** (`principles.md` rule 3). If an element stays put across a transition — e.g. a now-playing pill that opens into a player with the album art in the same top-left spot — don't match it to a "new" position; keep one stationary view and reveal the new content *around* it (grow the container's frame, fade the extra controls in). Faux-travel that moves an element to roughly where it already is reads as jumpy on SwiftUI too. And for a container hugging changing content, animate its `.frame`/size change with a spring (rule 9) rather than swapping views of different heights with a slide.

---

## 5. Stagger

**When:** a list or grid reveals item by item. **Preset: Pop/Glide** per item with a per-index delay, or a `PhaseAnimator` for a self-contained sequence.

Per-index delay (`i * 0.04`):

```swift
struct StaggerView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false
    private let items = Array(0..<6)

    var body: some View {
        VStack(spacing: 8) {
            ForEach(items, id: \.self) { i in
                Text("Row \(i)")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(.quaternary, in: .rect(cornerRadius: 8))
                    .opacity(shown ? 1 : 0)
                    .offset(y: shown ? 0 : 8)
                    .animation(rowAnimation(i), value: shown)
            }
            Button("Reveal") { shown.toggle() }
        }
        .padding()
    }

    private func rowAnimation(_ i: Int) -> Animation {
        reduceMotion
            ? .smooth(duration: 0.2)
            : .spring(duration: 0.4, bounce: 0.4).delay(Double(i) * 0.04)
    }
}
```

**Reduced motion:** drop the per-index `.delay` and the `offset` — everything fades in together with one `.smooth(duration: 0.2)`. No travel, no cascade.

---

## 6. Direction-aware tabs

**When:** swapping tab panels; a left tab should flash leftward, a right tab rightward, so the user builds a spatial map. **Preset: Snap** for the indicator pill (`matchedGeometryEffect`), slide for the panel by the sign of the index delta.

```swift
struct DirectionalTabsView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var ns
    @State private var selected = 0
    @State private var previous = 0
    private let tabs = ["Home", "Search", "Profile"]

    var body: some View {
        VStack(spacing: 24) {
            HStack {
                ForEach(tabs.indices, id: \.self) { i in
                    Text(tabs[i])
                        .padding(.vertical, 8).padding(.horizontal, 12)
                        .background {
                            if i == selected {
                                Capsule().fill(.blue.opacity(0.2))
                                    .matchedGeometryEffect(id: "pill", in: ns)
                            }
                        }
                        .onTapGesture { select(i) }
                }
            }

            Text("Panel: \(tabs[selected])")
                .frame(maxWidth: .infinity, minHeight: 120)
                .background(.quaternary, in: .rect(cornerRadius: 12))
                .id(selected)
                .transition(panelTransition)
        }
        .padding()
    }

    private func select(_ i: Int) {
        previous = selected
        withAnimation(reduceMotion ? .smooth(duration: 0.2) : .snappy(duration: 0.2)) {
            selected = i
        }
    }

    private var panelTransition: AnyTransition {
        guard !reduceMotion else { return .opacity }
        let forward = selected >= previous
        return .asymmetric(
            insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity),
            removal: .move(edge: forward ? .leading : .trailing).combined(with: .opacity)
        )
    }
}
```

**Reduced motion:** the panel `transition` becomes `.opacity` (no slide) and the indicator moves with `.smooth(duration: 0.2)`. Direction is preserved in code but expressed as a cross-fade.

---

## 7. Swipe-to-dismiss

**When:** the user flicks a card away. Track the finger 1:1, then on release seed a spring with the gesture's **velocity / predicted end** so the throw keeps its speed and direction. **Preset: Track.** Dismiss is destructive, so commit **on release** past a threshold — never mid-swipe (`principles.md` gesture law B).

```swift
struct SwipeToDismissView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var offset: CGSize = .zero
    @State private var dismissed = false

    var body: some View {
        if !dismissed {
            RoundedRectangle(cornerRadius: 16)
                .fill(.blue.gradient)
                .frame(width: 280, height: 160)
                .offset(offset)
                .gesture(
                    DragGesture()
                        .onChanged { offset = $0.translation } // 1:1 with the finger
                        .onEnded { value in
                            let predictedX = value.predictedEndTranslation.width
                            let committed = abs(predictedX) > 200 || abs(value.velocity.width) > 400
                            if committed {
                                withAnimation(.spring(duration: 0.35, bounce: 0.18)) {
                                    // throw off-screen in the flicked direction
                                    offset.width = predictedX > 0 ? 600 : -600
                                }
                                dismissed = true
                            } else {
                                withAnimation(.spring(duration: 0.35, bounce: 0.18)) {
                                    offset = .zero // snap back
                                }
                            }
                        }
                )
        }
    }
}
```

`DragGesture.Value` exposes `velocity` (`CGSize`, points/sec) and `predictedEndTranslation` — both are how you carry momentum into the settle.

**Reduced motion:** replace the swipe with a visible dismiss button and remove the fling. Set `dismissed = true` with `withAnimation(nil)` (instant) or a `.opacity` transition — no off-screen throw.

---

## 8. Number ticker

**When:** a count, price, or score changes and you want the digits to roll. **Preset: Snap/Glide with bounce 0** — overshoot on a number that means money is a lie (`principles.md`). Use `.contentTransition(.numericText())` and `.monospacedDigit()` so digits don't reflow.

```swift
struct NumberTickerView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var value = 1234

    var body: some View {
        VStack(spacing: 16) {
            Text(value, format: .number)
                .font(.system(size: 48, weight: .semibold))
                .monospacedDigit()
                .contentTransition(.numericText())
                .animation(reduceMotion ? nil : .snappy(duration: 0.2), value: value)

            Button("Add 50") { value += 50 }
        }
    }
}
```

For a currency value use `.contentTransition(.numericText(value: Double(value)))` with a `.currency` format and keep `bounce: 0`.

**Reduced motion:** pass `nil` to `.animation` — the number updates instantly with no roll. The value is still correct; only the kinetics are gone.

---

## 9. Hold-to-confirm

**When:** a press-and-hold that fills a progress ring before committing (delete, send, unlock). **Progress uses linear easing** over the hold duration — it's a deterministic sweep, not a spring. **Completion is Pop** (`.spring(duration: 0.4, bounce: 0.4)`) plus `.sensoryFeedback(.success)`.

```swift
struct HoldToConfirmView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var progress: CGFloat = 0
    @State private var confirmed = false
    private let holdDuration = 1.2

    var body: some View {
        ZStack {
            Circle().stroke(.quaternary, lineWidth: 8)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(.green, style: .init(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Image(systemName: confirmed ? "checkmark" : "lock.fill")
                .font(.title)
                .scaleEffect(confirmed && !reduceMotion ? 1.15 : 1)
                .animation(.spring(duration: 0.4, bounce: 0.4), value: confirmed)
        }
        .frame(width: 120, height: 120)
        .sensoryFeedback(.success, trigger: confirmed)
        .gesture(
            LongPressGesture(minimumDuration: holdDuration)
                .onChanged { _ in
                    withAnimation(.linear(duration: holdDuration)) { progress = 1 }
                }
                .onEnded { _ in confirmed = true }
        )
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onEnded { _ in
                    if !confirmed {
                        withAnimation(.smooth(duration: 0.2)) { progress = 0 } // released early
                    }
                }
        )
    }
}
```

**Reduced motion:** the linear fill is functional progress, so keep it (or shorten it). Drop the completion `scaleEffect` bounce — the checkmark just appears. The `.success` haptic still fires.

---

## 10. Success / confetti

**When:** a milestone lands — first save, payment complete, level up. This is a low-frequency, high-impact moment, so spend the delight budget. **Checkmark = Pop** (`.spring(duration: 0.4, bounce: 0.4)`); **particles = Lively** (`.spring(duration: 0.45, bounce: 0.5)`); add `.sensoryFeedback(.success)`. A `PhaseAnimator` gives the checkmark a one-shot pop without managing state.

```swift
struct SuccessView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var celebrate = false

    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                if !reduceMotion {
                    ForEach(0..<12, id: \.self) { i in
                        Circle()
                            .fill(.orange)
                            .frame(width: 8, height: 8)
                            .offset(y: celebrate ? -80 : 0)
                            .rotationEffect(.degrees(Double(i) / 12 * 360))
                            .opacity(celebrate ? 0 : 1)
                            .animation(.spring(duration: 0.45, bounce: 0.5), value: celebrate)
                    }
                }
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(.green)
                    .phaseAnimator([0, 1], trigger: celebrate) { view, phase in
                        view.scaleEffect(reduceMotion ? 1 : (phase == 1 ? 1 : 0.6))
                    } animation: { _ in
                        reduceMotion ? .smooth(duration: 0.2) : .spring(duration: 0.4, bounce: 0.4)
                    }
            }
            .frame(height: 180)
            .sensoryFeedback(.success, trigger: celebrate)

            Button("Celebrate") { celebrate.toggle() }
        }
    }
}
```

**Reduced motion:** the confetti `ForEach` is skipped entirely (continuous, multi-direction motion is exactly what Reduce Motion targets), and the checkmark settles with `.smooth(duration: 0.2)` — no scale bounce. The `.success` haptic still fires, so the moment still registers.

---

## Cross-links

- `spring-system.md` — preset values and the `(duration, bounce)` model.
- `principles.md` — the decision layer (when/which/why), gesture laws, reduced-motion rule.
- `recipes-web.md` / `gestures.md` — the same recipes on the web and the gesture-physics deep dive.

When in doubt: gate every spring on `accessibilityReduceMotion`, never bounce on numeric data, and commit destructive gestures on release — not mid-swipe.
