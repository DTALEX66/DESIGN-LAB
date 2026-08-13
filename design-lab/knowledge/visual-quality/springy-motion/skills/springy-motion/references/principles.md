# Principles — the why behind springy motion

This is the decision layer. Read it before reaching for a recipe. The recipes tell you *how*; this tells you *whether, which, and why*. Every rule traces to one of the three sources (Kowalski's vocabulary, Benji's *Family Values*, Rauno's *Invisible Details*).

---

## The one-line philosophy

> **Motion is not decoration. It is the explanation of what just happened, in the language of physics the body already speaks.**

Good motion answers three questions the user is silently asking: *Where did that go? What did I just do? What is related to what?* If an animation answers none of those, cut it.

---

## The three pillars (from *Family Values*)

1. **Simplicity** — reveal complexity gradually. Show the next thing as it becomes relevant, not all at once. Motion is how a surface "unfolds" into the next state. *("Each action makes the interface unfold and evolve, much like walking through a series of interconnected rooms.")*
2. **Fluidity** — connect states instead of cutting between them. **"We fly instead of teleport."** Every transition is a visible link from A to B. The app has unbreakable physical rules; respect them.
3. **Delight** — selective emphasis. A few deliberate, surprising moments matter more than motion everywhere. Delight is rationed by the Delight–Impact Curve (below).

These are in tension with raw speed, and that tension is the craft. Thoughtful motion can feel *as fast* as a cut while adding clarity.

---

## The prime directives (the rules engine)

Apply in order. Earlier rules win.

### 1. Purpose test — animate only to orient, give feedback, or show a relationship
If a motion does none of these, it is noise. Delete it. (Kowalski: *purposeful animation*.)

### 2. Frequency governs intensity — the inverse law
> The more often a user sees an animation, the shorter and subtler it must be.

This is the single most violated rule. It unifies two sources:
- **Delight–Impact Curve** (*Family*): delight potential ∝ 1 / frequency. Lavish the rare moments (first wallet, backup-complete confetti); restrain the daily ones (sending, typing).
- **Frequency & Novelty** (Rauno): high-frequency, low-novelty actions — especially **keyboard/mouse** — often should not animate at all. A command menu that fades every time becomes cognitive drag by the hundredth open. Removing motion from core keyboard flows can make the app *feel faster*.

**Practical mapping:**
| Frequency | Treatment |
|---|---|
| Many times/minute, keyboard-driven (command menu, list nav, tab switch by key) | **No motion** or `Snap`. Instant. |
| Common, pointer/touch (press, hover, open a menu) | `Snap`–`Glide`. Quick, faint life. |
| Occasional (open a sheet, navigate, confirm) | `Glide`–`Pop`. The everyday spring. |
| Rare / milestone (onboarding, first-time, success, easter egg) | `Pop`–`Lively`. Spend the delight budget here. |

### 3. Continuity over teleport — never cut what you can connect
- Prefer **shared-element / layout** transitions: an element travels and transforms into its next role (thumbnail → detail, button → tray).
- **Animate from the origin.** A popover grows from the button that opened it, not from screen center. A tray emerges from the control that summoned it. (Rauno's spatial consistency; CSS default transform-origin is the center — override it.)
- **Don't duplicate a persistent element.** If a component survives into the next state, *keep the same element* and move it. Cross-fading a thing into a copy of itself is the most common fluidity bug (*Family*'s "redundant animation" pet peeve).
- **Travel only when the place changes; otherwise anchor and reveal.** A persistent element should move *only if its position genuinely changes*. If it stays in the same place across the transition, don't animate it at all — keep it one stationary element and reveal the new content *around* it. A music pill that opens into a player keeps its album art fixed top-left and reveals the controls *below* (it opens downward); it does not morph the art into a "new" spot. Faux-travel — moving or scaling an element to roughly where it already is — reads as jumpy. The cleanest "shared element" is often not a shared element at all.
- **Morph text via shared letters.** "Continue" → "Confirm" keeps the shared "Con" and morphs the rest, so the user registers the consequential change. Use for value-bearing label changes (amounts, counts, step labels).
- **Keep the constant parts constant.** When only part of a sentence/UI changes, animate only that part (empty states, counters), not the whole block.

### 4. Direction encodes space
Forward slides one way, back slides the opposite. Tapping a left tab flashes leftward motion; a right tab, rightward. The user builds a mental map. Never let the same navigation animate inconsistently. (*Family*: "a flash of directional motion… we fly instead of teleport." Rauno: spatial consistency.)

### 5. Springs for anything physical or interruptible; eased curves for the rest
- Use a **spring** when motion responds to the user, can be interrupted, carries momentum, or should feel alive (gestures, drags, presses, entrances, layout moves).
- Use **fixed easing** for deterministic, non-interruptible, ambient motion (a progress sweep, a one-shot reveal where physics adds nothing).
- See `spring-system.md` and `easing.md` for the exact parameters.

### 6. Easing law (when you do use curves)
- **ease-out** is the default for anything responding to the user — it starts fast (feels responsive) and settles soft.
- **ease-in-out** for elements already on screen moving A→B.
- **Never bare ease-in** for UI (feels sluggish, like lag). Reserve ease-in for *exits that leave the screen*.
- **linear** only for spinners, marquees, and continuous ambient loops.
- **Asymmetric** curves (accelerate and decelerate at different rates) feel more alive than symmetric ones.

### 7. Performance is a feature
Animate **transform** and **opacity** only — they composite on the GPU. Animating `width/height/top/left/margin` thrashes layout every frame and janks. Use `will-change` sparingly and only just before animating. 60fps is the floor; jank reads as "this app doesn't understand me."

### 8. Reduced motion is non-negotiable
Honor `prefers-reduced-motion` / Reduce Motion. The reduced variant is not "nothing" — it's a *calmer* version: cross-fade or instant change instead of travel/scale/spring. Continuity and feedback must survive; only the kinetics are dialed down. Every recipe in this skill ships a reduced variant.

### 9. Boxes hug their content — resize, don't shuffle
When the content inside a container changes — a step in a flow, an expanding card, a panel swapping views — the **container springs to hug the new content's size** (a quick, springy resize) while the content changes with a **quick scale + crossfade in place**. Never slide the new content in sideways while the box jumps height: that "shuffles," the whole component shudders, and it reads as broken.

The resizing box is the *star* of the motion; the content swap is secondary and quick. Two ways to do it:

- **Hug (preferred):** measure the new content and animate the container's `height`/`width` **directly** with a springy spring (~0.3–0.4s, a little bounce so it "grabs" the new size). Swap content with a quick scale (`0.96 → 1`) + fade. Animate the dimension *directly* — **not** via Motion `layout` on a box whose children change, because `layout` scale-corrects children and warps them mid-transition (the classic "scaly fade" that looks awful).
- **Fixed + progressive:** keep the box a set size and reveal the new content progressively (stagger / crossfade) inside it.

This is the same rule the spring presets serve at the micro scale (a button hugging its label as it morphs Continue→Confirm) applied at the container scale. See the **Resizable panel** recipe in `recipes-web.md`.

---

## The gesture laws (from *Invisible Details*)

Gestures are where motion becomes a conversation. Five laws:

### A. Respond 1:1, immediately
A naive gesture animates `0 → 1` only after a threshold, giving zero feedback during the drag. **Wrong.** The element must track the finger/pointer *immediately and proportionally* from the first pixel — then, past a threshold, a spring can take over and complete the motion. Feel the delta apply in real time; never wait to react.

### B. Trigger timing depends on consequence
- **Lightweight, reversible** actions (reveal a search bar, peek a panel) can trigger **during** the gesture, once elements reach their logical position. Waiting for release would feel broken.
- **Destructive or committing** actions (dismiss an app, delete, send) trigger **on release**, regardless of distance. This protects against accidental commits and lets the user change their mind mid-gesture. *"Dismissing is destructive — it wouldn't feel nice if it dismissed mid-swipe."*

### C. Preserve momentum and angle
A flicked element keeps the velocity *and the direction* it was thrown with. A spring carries that velocity into the settle, so motion is continuous, never "reset and replay." Heavier conceptual objects bounce less.

### D. Always interruptible
An animation in flight must be redirectable at any moment without finishing first. The iOS Settings panel that won't let you swipe back until the open animation completes feels broken; the App Switcher that redirects instantly feels alive. Springs make this natural — re-target by injecting current velocity.

### E. Resist at boundaries (rubber-banding)
Dragging past an edge meets increasing resistance and snaps back. This communicates "there's nothing more here" kinetically instead of with a hard stop.

---

## Deeper ideas (taste, not rules)

- **Metaphors compound.** Reuse a few gestures (tap, swipe, pinch) modeled on the real world (pages turn like a book, pinch = precision grab, swipe-up = lift a card off a stack). Learnability comes from consistency, not novelty.
- **Touch content visibility.** When a finger covers what it manipulates, surface a proxy (the iOS caret loupe, the enlarged key, a value bubble above a slider). Don't cancel a drag just because the finger left the target.
- **Implicit input.** The best input is no input. Infer intent from context (raise-to-wake shows the route; presenting a pass brightens the screen; App Switcher blurs sensitive content). Motion can acknowledge inferred state.
- **Fitts's Law.** Time-to-target depends on size and distance. Screen corners/edges are infinitely large targets (you can't overshoot). Origin-aware menus (radial, context) minimize travel — spawn actions around the pointer.
- **Fidgetability.** Some motion exists to be *played with* (pull-to-refresh stretch, a toggle that springs). A little tactile joy with no functional purpose is still purposeful: it builds affection.
- **Polish everywhere buys delight anywhere.** Users notice the one unpolished corner (the "fancy restaurant with a dirty bathroom"). A consistent floor of quality is what makes a sprinkled delight land instead of feeling random.
- **Proximity over binary hover.** Respond to the cursor's *distance*, not just on/off hover. Nearby elements can subtly scale, lift, sharpen, or darken by how close the pointer is (dock magnification). It makes an interface feel responsive and alive rather than binary — and it's a gradient, so it reads as continuous attention, not a switch. The win is precisely that gradient: the cursor's *neighbors* also respond (scaling and darkening by distance), which is what reads as organic. **Direct scaling** — only the hovered item growing while its neighbors stay flat — feels mechanical by comparison; that contrast is the whole point. Spring-smooth the follow so it's alive, not twitchy; far elements can dim. **Magnify with a `scale` transform, never width/height** — animating size reflows the row and scales the *background surface*, so the whole dock jiggles as you move. Scale keeps the canvas static; the tiles rise above it (`overflow: visible`, `transform-origin: bottom`). The surface itself may scale up **once** on hover-enter (a single state change — the dock "wakes up", then holds), but it must never resize *per cursor-move* — continuous surface-resizing is the jiggle. So: one hover-scale on the surface (a state) + continuous magnify on the children (a transform). **And the children must not overlap** — scaling a tile in place collides it with its neighbors. Push them apart: give each tile a `scale` *and* an `x` offset equal to the cumulative growth of the tiles between it and the cursor (lay the scaled widths out, anchor the point under the cursor, express the result as a per-tile offset). That keeps the layout boxes fixed (surface stays static) while the tiles fan apart (no overlap). Width-based layout would also fan them apart but reflows/jiggles the surface; scaling-in-place keeps the surface static but overlaps — **scale + translate-push is the only thing that gets both.** (Code: `recipes-web.md` #15 proximity dock.)
- **Animate the hierarchy, not just the layer.** When a group enters, don't slide one container in as a block. Stagger the *structure* first (the cards), then bring in the *detail* (their text) on a second, longer stagger. The eye reads structure → detail, and the same UI suddenly feels intentional instead of mechanical. This is staging + orchestration at the component level. (Code: `recipes-web.md` "Animate the hierarchy.")

**Naming the transition tells you how to move.** Pick the type before the curve:
- **Continuity transition** — keep the user oriented by visually connecting before & after (a shared element travels). Use when the same thing persists across states.
- **Drill transition** — go *deeper into a hierarchy* (a row → its detail). Direction-aware: forward drills in, back drills out; the detail can grow from the row it came from (origin-aware).
- **Context transition** — switch between *peers at the same level* (tabs, sibling sections). A lateral move, not a drill; direction encodes which sibling (left tab → leftward motion). The canonical motion is a **shared-axis (X) slide** (Material's term): the old panel slides fully *out* one side, the new *in* from the other — a carousel / "push", **no fade**. Contrast **fade-through** (a cross-fade with a tiny offset), which is for *unrelated* content where there's no spatial relationship to preserve. For tabs and paged views, shared-axis; for swapping unrelated cards, fade-through.

---

## How to choose, fast

```
Is this responding to a user action, interruptible, or carrying momentum?
  → spring.  Pick the preset by FREQUENCY (rule 2): Snap / Glide / Pop / Lively / Track.
Is it a one-shot, deterministic, non-interruptible move?
  → eased curve. ease-out (responsive) or ease-in-out (A→B on screen).
Is it ambient/looping?
  → linear, low amplitude, respect reduced-motion.
Could you instead CONNECT two states (shared element, morph, layout)?
  → almost always do that instead of a fade. Continuity > crossfade.
Does the user see this dozens of times an hour, especially via keyboard?
  → make it instant or remove it.
Did you add a reduced-motion variant?
  → if not, you're not done.
```

When in doubt: **shorter, softer, more connected.** Beautiful motion is usually less motion, aimed better.
