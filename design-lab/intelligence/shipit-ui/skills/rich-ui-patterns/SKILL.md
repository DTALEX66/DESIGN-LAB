---
name: rich-ui-patterns
description: Apply rich modern UI patterns — browser/device mockups, mesh gradients, layered surfaces, glassmorphism, gradient borders, tilt cards, spotlight cursor, animated borders — when generating hero sections, marketing pages, or any UI that needs visual depth beyond a plain card+text layout. Auto-activates when user asks for "modern", "rich", "polished", "hero", "marketing", "landing".
type: skill
---

# Rich UI Patterns

## Default-to-rich mandate

**The mandate: when generating UI on a marketing or landing surface, the patterns in this skill are the DEFAULT, not opt-in.** A hero without a mockup or mesh gradient is a failure. A feature card with a 24×24 monochrome icon and plain text is a failure. A stat row with bare numbers is a failure.

Rich does not mean cluttered. The richness budget remains 3 simultaneous patterns per screen. But the budget should be SPENT, not banked. Plain output is the enemy this skill exists to eliminate.

---

This skill is the catalog Claude reaches for when the brief is "modern", "polished", "hero", "marketing", "landing", or when an audit calls a screen "plain". None of these patterns are decoration. Each has a function — establishing hierarchy, signaling brand, drawing the eye to a CTA, communicating depth, or anchoring a section. Use them deliberately, but use them by default on every marketing surface.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

---

## The richness budget

For any single screen, no more than **three** advanced patterns may be active simultaneously. A hero with mesh gradient + tilt cards + spotlight cursor + animated border + floating chips reads as a demo, not a product. Pick the three that serve hierarchy and brand; cut the rest.

The patterns below are listed in rough order of "safe to combine" — early entries are quiet enough to layer; later entries (spotlight cursor, animated borders) are loud and demand they be the only loud thing on screen.

---

## Pattern catalog

### Layered surfaces

**Anatomy.** Four-step elevation: `--color-bg` (page), `--color-surface` (default card), `--color-surface-elevated` (modals, popovers), `--color-surface-overlay` (toasts, palette). Each step gains a slightly stronger shadow.

```css
.surface { background: var(--color-surface); box-shadow: var(--shadow-sm); }
.surface-elevated { background: var(--color-surface-elevated); box-shadow: var(--shadow-md); }
.surface-overlay { background: var(--color-surface-overlay); box-shadow: var(--shadow-lg); }
```

**When to use.** Always. This is the depth grammar; almost every screen benefits.
**When NOT.** Dense data tables — shadows multiply visual noise on grid-heavy surfaces. Keep tables flat.

### Ambient mesh gradients

**Anatomy.** Three large blurred radial gradients at 18–25% opacity, paired with a 4–6%-opacity grid overlay. Anchor on `--color-brand-400`, `--color-accent-400`, `--color-brand-300`.

```css
.hero {
  background:
    radial-gradient(60% 40% at 20% 30%, color-mix(in oklch, var(--color-brand-400) 22%, transparent), transparent),
    radial-gradient(50% 40% at 80% 60%, color-mix(in oklch, var(--color-accent-400) 20%, transparent), transparent),
    radial-gradient(50% 50% at 50% 90%, color-mix(in oklch, var(--color-brand-300) 18%, transparent), transparent),
    var(--color-bg);
}
.hero::before { content: ""; position: absolute; inset: 0;
  background-image: linear-gradient(var(--color-border-subtle) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-border-subtle) 1px, transparent 1px);
  background-size: 32px 32px; opacity: 0.06; pointer-events: none; }
```

**When to use.** Hero sections, signup splashes, feature-launch banners — anywhere the page must feel "designed" within the first 200 ms.
**When NOT.** Behind body copy (kills legibility), behind data viz (gradients fight the chart's color encoding), in dashboards (visual noise).

### Glassmorphism done right

**Anatomy.** `backdrop-filter: blur(24px) saturate(180%)`, semi-transparent surface. Test contrast with the busiest content the overlay can sit on.

```css
.glass {
  background: color-mix(in oklch, var(--color-surface) 70%, transparent);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid color-mix(in oklch, var(--color-border) 60%, transparent);
}
```

**When to use.** Sticky nav over a colorful hero, command palette, floating mobile tab bar, toast surface.
**When NOT.** Body content cards. Glassmorphism on body cards reads as iOS skeuomorphism circa 2020 and breaks contrast on long sessions. Verify `backdrop-filter` support; ship a solid fallback for older browsers.

### Browser / device mockups

**Anatomy.** SVG chrome (rounded corners, traffic lights or notch) wrapping the mock content. Soft `--shadow-lg`. The chrome is decorative (`aria-hidden="true"`); the mock content inside, if it conveys meaning, gets a label on the wrapper.

See `svg-illustration/SKILL.md` "Browser / device mockups" for the SVG recipe.

**When to use.** Marketing showcases of in-product UI, feature-page screenshots, "see it in action" sections.
**When NOT.** Inside a live app — the chrome reads as "image of UI" and confuses users about whether they're looking at their data.

### Animated number counters

**Anatomy.** `useMotionValue` + `useTransform` + `Intl.NumberFormat`. Animate on viewport entry, once. Reduced-motion: skip animation, show final value.

See `motion-design/SKILL.md` "Number counters" for the recipe.

**When to use.** Stats sections on marketing pages ("12,400 teams", "98% retention", "2.3 M requests/day").
**When NOT.** Currency, dates, precise data. Counting up imprecise-looking numbers ("$1,247.83") feels gimmicky. One stats row per page.

### Section background alternation

**Anatomy.** Alternate `--color-bg` and `--color-surface` per section. 5–8% lightness delta — subtle, not card-on-page strong. Removes the need for divider lines.

**When to use.** Long marketing pages, docs landing pages, scrolling case studies.
**When NOT.** Dashboards (the bands fight data hierarchy). Pages with fewer than three sections (the rhythm needs repetition).

### Tilt cards

**Anatomy.** `perspective(1000px) rotateX/Y` ±8° tracking cursor. Coarse-pointer fallback: no tilt. Pair with a same-axis shadow shift for depth.

See `motion-design/SKILL.md` "Tilt cards" for the recipe.

**When to use.** 3–6 feature cards in a showcase grid, testimonial cards, plan-comparison cards.
**When NOT.** Long lists (8+ items become nausea-inducing on scan). In-product cards (the effect feels like a demo).

### Gradient borders

**Anatomy.** Transparent border with a two-layer background — solid surface inside, gradient outside.

```css
.gradient-border {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--color-surface), var(--color-surface)) padding-box,
    linear-gradient(135deg, var(--color-brand-400), var(--color-accent-400)) border-box;
}
```

**When to use.** The page's single most important card or CTA — pricing tier marked "popular", featured testimonial, primary plan.
**When NOT.** On every card. If everything has a gradient border, nothing does.

### Floating chips / badges

**Anatomy.** Small absolutely-positioned cards orbiting a hero illustration, each with a stagger-offset float (4–6 px y oscillation, 6–10 s, ease-in-out, infinite). Reduced-motion: static.

```jsx
<motion.div animate={{ y: [0, -6, 0] }}
  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
  className="absolute right-8 top-12">
  <Chip icon={Sparkles}>AI assist</Chip>
</motion.div>
```

**When to use.** Hero illustrations of products with multiple discrete features (each chip names one). Empty-state encouragement scenes.
**When NOT.** Cluttered hero compositions; chips need negative space. More than five chips becomes a swarm.

### Spotlight cursor

**Anatomy.** Large radial gradient (300–400 px) following the cursor at 8–12% opacity. Position via CSS custom properties updated on `mousemove`.

```jsx
const onMove = (e) => {
  e.currentTarget.style.setProperty("--mx", `${e.clientX}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY}px`); };
```

```css
.spotlight { position: relative; }
.spotlight::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(400px circle at var(--mx) var(--my),
    color-mix(in oklch, var(--color-brand-400) 12%, transparent), transparent 60%); }
```

**When to use.** Dark hero sections only — invisible on light backgrounds. One per page.
**When NOT.** In-product. Light themes. Mobile (touch has no cursor; gate with `(pointer: fine)`).

### Animated borders

**Anatomy.** Conic gradient rotating via `@property --angle` animation. See `motion-design/SKILL.md` "Animated borders".

**When to use.** The single most important CTA on the page — usually the hero's primary button on a launch or pricing page.
**When NOT.** Lists of buttons. Anything that runs more than ~6 s without user interaction (becomes wallpaper).

### Underline text effects

**Anatomy.** `background-image` linear gradient sized 0×2 px, transitioning to 100%×2 px on hover.

```css
.link-underline { background-image: linear-gradient(var(--color-brand-500), var(--color-brand-500));
  background-size: 0 2px; background-position: 0 100%; background-repeat: no-repeat;
  transition: background-size var(--dur-300) var(--ease-out-quint); }
.link-underline:hover { background-size: 100% 2px; }
```

**When to use.** Inline links in long-form content (docs, blog, marketing copy).
**When NOT.** Nav (too subtle for active state). Buttons (use a real button style).

### Section eyebrow pills

**Anatomy.** Above each section heading: a small pill, `--color-brand-50` background, `--color-brand-700` text, optional pulsing `--color-accent-400` dot.

```jsx
<span className="inline-flex items-center gap-2 px-3 py-1 rounded-full
  text-xs font-medium bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-400)] animate-pulse" />
  What's new
</span>
```

**When to use.** Marketing pages with multiple sections, each introducing a different theme. Establishes consistent micro-hierarchy.
**When NOT.** Mixing eyebrow styles within a page. Pick one shape and color and repeat.

---

## The "rich without overdoing it" check

Before shipping a screen, audit:

1. Count active advanced patterns. **Three or fewer.** If more, cut.
2. Identify the page's single primary CTA. **One** loud pattern (animated border, gradient border, spotlight) attaches to it.
3. Check the body copy. Mesh gradients, glass, spotlight must not sit behind reading-length text.
4. Verify reduced-motion. Every animated pattern has a static fallback emitted.
5. Verify light + dark. The patterns are token-driven, but mesh gradients in particular need their opacities re-tuned for dark backgrounds (often higher, 25–35%).

---

## Cross-references

- `motion-design/SKILL.md` — recipes for all motion-bearing patterns (mesh drift, magnetic hover, tilt, animated borders, counters, marquee, page reveal).
- `ui-design-principles/SKILL.md` — the rubric these patterns plug into; the "Modern visual richness" section enumerates the same catalog at a glance.
- `svg-illustration/SKILL.md` — SVG recipes for browser mockups, mesh-in-SVG, decorative section backgrounds, isometric scenes.
- `references/design-rules/tinted-neutrals.md` — tinted bg/surface foundation that makes layered surfaces read as designed rather than washed-out.
- `references/canonical-tokens.md` — token names the recipes here reference.
