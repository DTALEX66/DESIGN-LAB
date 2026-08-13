# Review checklist — the motion critique rubric

Use this when the job is to **review/improve** existing motion (not build from scratch). Walk the smells top to bottom. Each is: what to look for → why it's wrong → the fix → which principle it violates (`principles.md`).

Score each finding **blocker / smell / nit**. Lead the review with blockers.

---

## How to run a review

1. **Inventory the motion.** List every animated transition, gesture, hover/press, entrance/exit, loop. For each, note: trigger, properties animated, duration/curve, frequency of use.
2. **Run each through the smells below.**
3. **Check the universals** (reduced-motion, performance, interruptibility) on every item.
4. **Report**: blockers first, then smells, then nits. For each, give the file:line if known, the principle, and the concrete fix (ideally the corrected snippet).

---

## Blockers (fix before shipping)

### ▣ Animating layout properties
**Look for:** transitions on `width`, `height`, `top`, `left`, `margin`, `padding`, or anything that triggers reflow.
**Why:** layout thrash every frame → jank. **Fix:** animate `transform` (translate/scale) and `opacity` only; use FLIP or layout animations for size/position changes. *(Principle 7)*
**Exception:** a *single small surface* that must **morph its box shape** (a Dynamic-Island pill, an expanding card, a content-hugging panel) may animate `width`/`height`/`borderRadius` directly — that's the correct technique exactly where Motion `layout`/scale distorts the corners (recipes-web.md → Morphing & resizing). Still a blocker on lists, large surfaces, or anywhere a `transform` would do the same job.

### ▣ No reduced-motion path
**Look for:** travel/scale/spring motion with no `prefers-reduced-motion` / Reduce Motion handling.
**Why:** accessibility failure; can cause nausea/vestibular issues. **Fix:** add a calmer variant (crossfade/instant) that preserves feedback and continuity. *(Principle 8)*

### ▣ Non-interruptible gesture or transition
**Look for:** you can't reverse/redirect a swipe or open/close until the animation finishes; gestures that "replay from 0" instead of catching current velocity.
**Why:** feels broken, fights the user. **Fix:** interruptible springs; re-target with current velocity. *(Gesture law D)*

### ▣ Naive 0→1 gesture (no live tracking)
**Look for:** element only moves after a threshold; no 1:1 response during the drag.
**Why:** zero affordance, feels dead. **Fix:** track the pointer/finger proportionally from pixel one, then spring past threshold. *(Gesture law A)*

### ▣ Destructive action commits mid-gesture
**Look for:** delete/dismiss/send fires during the swipe by distance.
**Why:** accidental, irreversible commits. **Fix:** commit on release for destructive/committing actions. *(Gesture law B)*

---

## Smells (should fix)

### ◆ Over-animated high-frequency action
**Look for:** a fade/scale on something used dozens of times an hour — command menu, list selection, tab switch, especially keyboard-driven.
**Why:** novelty decays; becomes cognitive drag; *feels slower*. **Fix:** make it instant or `Snap`; consider removing motion entirely. *(Principle 2 — the inverse law)*

### ◆ Teleport instead of connect
**Look for:** a hard cut or crossfade between states that share an element (thumbnail→detail, list→edit, button→sheet).
**Why:** user loses the thread; "digital whiplash." **Fix:** shared-element / layout transition; let the element travel. *(Principle 3)*

### ◆ Redundant / duplicated element
**Look for:** a component that persists across states gets cross-faded into a copy of itself, or re-mounts and re-animates instead of staying put.
**Why:** *Family*'s pet peeve; breaks object permanence. **Fix:** keep the same element, animate it to its new place. *(Principle 3)*

### ◆ Center-origin popover / menu
**Look for:** a popover, tooltip, or tray that scales from its own center instead of from the control that opened it.
**Why:** loses the spatial link to its trigger. **Fix:** set transform-origin to the trigger; grow from source. *(Principle 3, Fitts)*

### ◆ Direction-blind navigation
**Look for:** forward and back animate the same way; left/right tabs animate identically.
**Why:** no spatial map. **Fix:** direction-aware transitions (forward vs back move opposite). *(Principle 4)*

### ◆ ease-in (or linear) on user-facing UI
**Look for:** `ease-in`, `linear`, or a symmetric `ease` on responsive transitions.
**Why:** ease-in feels laggy; linear feels robotic. **Fix:** ease-out for responses; ease-in-out for on-screen A→B; springs for physical motion. *(Principle 6)*

### ◆ Wrong spring character for the context
**Look for:** a bouncy spring on a frequent/utilitarian control, or a dead/over-damped spring on a delight moment.
**Why:** bounce on the daily path is annoying; flatness wastes a milestone. **Fix:** match preset to frequency (`spring-system.md`). *(Principle 2)*

### ◆ Hard wall at scroll/drag boundaries
**Look for:** dragging past an edge just stops dead.
**Why:** no kinetic signal of the limit. **Fix:** rubber-band resistance + snap-back. *(Gesture law E)*

### ◆ Decoration without purpose
**Look for:** motion that doesn't orient, give feedback, or show a relationship.
**Why:** noise; slows perceived speed. **Fix:** cut it, or repurpose it to carry meaning. *(Principle 1)*

---

### ◆ `layout` fighting explicit dimensions
**Look for:** Motion `layout` on an element that *also* sets `width`/`height`/`borderRadius` in `style` (a morphing pill, an expanding card).
**Why:** the two own size differently — corners distort and the box "snaps" instead of growing. **Fix:** animate the dimensions directly (`animate={{ width, height, borderRadius }}`), drop `layout`. *(recipes-web.md → Morphing & resizing)*

### ◆ `layoutId` + `animate` transforms on one element
**Look for:** the same element carries both `layoutId` and `animate={{ x/y/scale }}`.
**Why:** both try to own position; they fight and glitch mid-transition. **Fix:** pick one — if you compute the transforms yourself, drop the `layoutId`. *(recipes-web.md)*

### ◆ Repositioning persistent content
**Look for:** an element that stays in roughly the same place across a transition is animated as a traveling shared element (moves/scales into where it already is).
**Why:** reads as jumpy; it's faux-travel. **Fix:** anchor it, reveal new content around it (open downward, etc.). *(Principle 3)*

### ◆ Content swap that shuffles
**Look for:** new content slides in sideways while the container's height jumps.
**Why:** the whole component shudders. **Fix:** the box springs to *hug* the new content (animate `height` directly), content scale-fades in place. *(Principle 9, recipes-web.md #14)*

### ◆ Animating box-shadow via Motion on hover
**Look for:** `whileHover={{ boxShadow: '...' }}` — animating a shadow string in JS.
**Why:** Motion reverting the shadow to the CSS base on un-hover flickers like "a glow switching off"; big glows also read as harsh. **Fix:** do shadow on CSS `:hover` with a `transition` (reverts cleanly); keep Motion hover to a subtle transform lift (`y:-2` / `scale:1.02`). Hover is a small lift, never a harsh glow. *(recipes-web.md → Morphing & resizing)*

### ◆ Swapping centered content with `popLayout` / `wait`
**Look for:** an icon or label crossfade (play↔pause, a morphing button label) using `<AnimatePresence mode="popLayout">` or `"wait"` inside a centered box.
**Why:** `popLayout` pops the exiting node to absolute → it jumps to the corner mid-swap; `"wait"` leaves a blank gap between out and in. **Fix:** stack both in the same grid cell (`style={{ gridArea:'1 / 1' }}`, parent `display:grid; place-items:center`) and crossfade in place (default sync). *(recipes-web.md)*

### ◆ Overlay/fill opacity that flashes on reset
**Look for:** a progress fill / overlay whose visibility is a `style={{ opacity }}` (or `scaleX`) that *jumps* when a state resets — e.g. a hold-to-confirm fill that reappears full-red on reset.
**Why:** the value snaps instead of fading. **Fix:** drive opacity through `animate` so it fades *out in place* and never reappears; hold the scale where it is during the fade.

### ◆ Magnify/grow a child via width/height (jiggles the surface)
**Look for:** a proximity dock, hover-grow, or magnify that animates an element's `width`/`height` (or anything that reflows its row).
**Why:** it resizes the *background surface* behind it, so the whole thing jiggles as the pointer moves. **Fix:** magnify via a `scale` transform (`transform-origin` toward the anchored edge); keep the layout box fixed so the surface stays static; `overflow: visible` lets it grow past the tray. *(principles.md → Proximity; recipes-web.md #15)*

### ◆ Magnified items overlapping their neighbors
**Look for:** a dock/row where the hovered item scales *in place* and visually collides with the items beside it.
**Why:** `scale` alone grows an item over its neighbors. **Fix:** add an `x` push to each item equal to the cumulative growth of the items between it and the cursor (lay the scaled widths out, anchor the cursor point, offset from base) — they fan apart with the layout boxes still fixed, so the surface stays static *and* nothing overlaps. *(principles.md → Proximity; recipes-web.md #15)*

## Nits (polish)

- **Duration drift:** transitions noticeably > ~500ms for routine UI feel sluggish; < ~120ms can feel abrupt for travel. Tune to the spring presets.
- **Finger/pointer occlusion:** dragging something the cursor/finger covers, with no proxy (loupe/value bubble). *(Touch content visibility.)*
- **Inconsistent polish:** one corner of the app animates beautifully, another snaps crudely. Even out the floor. *(Polish everywhere.)*
- **`will-change` left on permanently:** wastes memory/compositor layers. Set it just-in-time, remove after.
- **Tabular numbers missing** on tickers/timers/counters, so digits jitter as they change.
- **Stagger too slow:** cascade delays that add up to a wait. Keep per-item delay tight (~20–40ms) and cap total.

---

## The 10-second gut check

If you only have a moment, ask:
1. Does it animate `transform`/`opacity` only? (perf)
2. Can I interrupt and reverse it? (life)
3. Is there a reduced-motion variant? (a11y)
4. Is the intensity right for how often I'll see it? (frequency)
5. Does it connect the two states or just cut? (continuity)

Three or more "no"s → it needs work.
