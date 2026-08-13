---
name: images-and-media
description: Apply senior image and media design — when to use raster vs SVG vs CSS gradients, aspect ratios, Next.js Image / lazy loading / blur placeholder strategies, art direction across breakpoints, photo treatment (duotone, mask, overlay), avatar systems. Auto-activates on edits to files containing `<img>`, `next/image`, `<picture>`, or media-heavy components.
type: skill
---

# Images and Media

Plain `<img src>` is the lowest grade of image work. Senior output reasons about: format choice (raster vs vector vs gradient), aspect ratio reservation (no CLS), loading strategy (eager LCP / lazy below-fold), placeholder strategy (blur), art direction (different crops per breakpoint), and post-treatment (duotone, overlays). This skill encodes those defaults.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

---

## When to use what — decision tree

| Need | Format | Why |
|---|---|---|
| Brand mark / logo | SVG | Crisp at any size, themeable, tiny payload |
| Icon | SVG | Same; never raster for icons |
| Data visualization | SVG (or `<canvas>` for high cardinality) | Vector, accessible, themeable |
| Product photography | Raster (AVIF → WebP → JPEG fallback) | Photographic content needs photographic compression |
| Editorial photography | Raster | Same |
| Marketing illustration | SVG (preferred) or raster | SVG when geometric/two-tone; raster when full-painted |
| Hero ambient decoration | CSS gradient or SVG mesh | Lighter than a raster image; themeable |
| Decorative pattern | SVG `<pattern>` | Tiles cheaply, scales |
| User-generated content (avatars, uploads) | Raster (AVIF/WebP) | Source is raster |
| Animated illustration | Lottie (JSON) or SVG + CSS/JS | GIF is never the answer |

Never raster for icons. Never SVG for photographs. Never animated GIF — Lottie or video instead.

---

## Aspect ratios — reserve space, prevent CLS

Always set explicit dimensions or `aspect-ratio` so the browser reserves layout before the image loads.

| Ratio | Use |
|---|---|
| 16:9 | Hero banners, video thumbnails, blog headers |
| 4:3 | Product photography, editorial |
| 1:1 | Social tiles, avatars, gallery thumbnails |
| 21:9 | Cinematic hero bands, full-bleed marketing |
| 3:4 | Mobile portrait hero, app-screenshot frames |
| 9:16 | Reels / stories embeds |

```css
.thumb { aspect-ratio: 16 / 9; width: 100%; }
.avatar { aspect-ratio: 1; width: var(--space-10); }
```

Always pair with `width` + `height` attributes when using raw `<img>`; the browser uses them to compute the intrinsic ratio and reserve space before bytes arrive.

---

## Loading strategy

| Position | Attribute | Notes |
|---|---|---|
| Above the fold (LCP candidate) | `loading="eager"` + `fetchpriority="high"` | One per page max |
| Below the fold | `loading="lazy"` | Default for everything else |
| Decorative bg | CSS `background-image` | No loading attribute applies; use `image-set()` for retina |

Never `loading="lazy"` on the LCP image — it delays the largest contentful paint and tanks Core Web Vitals.

---

## Blur placeholder

Reserve layout, hint at content while bytes arrive. Three approaches:

- **Next.js `next/image`** — `placeholder="blur"` plus `blurDataURL` (auto-generated for static imports, manual base64 for remote). Cleanest in Next stacks.
- **Hand-rolled** — encode a 32×18 (or matching-ratio) low-quality JPEG, base64-embed, set as `background-image`, layer the real image on top with opacity transition.
- **LQIP via CSS color** — sample the dominant color, set as a solid background. Cheapest, no payload, works anywhere.

```jsx
<div style={{ aspectRatio: "16/9", backgroundImage: `url(${blurDataURL})`,
  backgroundSize: "cover", backgroundColor: "var(--color-surface)" }}>
  <img src={src} alt={alt} loading="lazy" decoding="async"
    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
</div>
```

---

## Art direction — different crops per breakpoint

Mobile gets a tighter crop than desktop. The same source rarely composes well at both 21:9 and 3:4.

```html
<picture>
  <source media="(min-width: 1024px)" srcset="/hero-wide.avif" type="image/avif" />
  <source media="(min-width: 1024px)" srcset="/hero-wide.webp" type="image/webp" />
  <source media="(max-width: 1023px)" srcset="/hero-portrait.avif" type="image/avif" />
  <img src="/hero-wide.jpg" alt="…" width="1600" height="900" />
</picture>
```

Use `<source media="…">` for crop swaps; use `srcset` (within a single `<source>`) only for resolution swaps of the same crop.

---

## Photo treatment — never raw stock

Untreated stock photography looks like stock photography. Apply at least one treatment:

- **Duotone** — blend the photo with two brand-tinted versions (highlights = `--color-brand-200`, shadows = `--color-brand-800`). `mix-blend-mode: multiply` plus `filter: grayscale(1) contrast(1.1)`.
- **Gradient overlay for legibility** — 40–60% opacity from `--color-bg` (top-down or bottom-up depending on copy placement). Required when text sits on the image.
- **Clip-path masks** — non-rectangular crops for editorial feel. Always pair with a fallback `border-radius` on browsers that don't support the path.
- **Parallax depth** — image translates at 0.6× scroll speed inside a fixed-height container. Reduced-motion: static.

```css
.duotone { filter: grayscale(1) contrast(1.1); }
.duotone::after { content: ""; position: absolute; inset: 0; mix-blend-mode: multiply;
  background: linear-gradient(135deg, var(--color-brand-300), var(--color-brand-700)); }
.legible-overlay::after { content: ""; position: absolute; inset: 0;
  background: linear-gradient(to top, var(--color-bg) 0%, transparent 60%); }
```

---

## Avatar systems

Sizes (token-mapped):

| Size | Diameter | Use |
|---|---|---|
| xs | 24 px (`--space-6`) | Inline mention, comment list density |
| sm | 32 px (`--space-8`) | Compact list rows |
| md | 40 px (`--space-10`) | Default list, navbar |
| lg | 48 px (`--space-12`) | Profile cards |
| xl | 64 px (`--space-16`) | Profile header |

Letter fallback: initials in `--color-brand-100` background, `--color-brand-700` foreground, `font-weight: 600`. Generate from the user's name; first letter of first + first letter of last, uppercased.

Status dot (online/away/offline): bottom-right, 25% of avatar diameter, `box-shadow: 0 0 0 2px var(--color-bg)` so the ring matches the surrounding surface and reads as a cutout.

---

## Decoration vs content — accessibility

Constitution rule 5: every image is labeled or marked decorative.

- **Decoration** (purely visual, content is communicated elsewhere) — `<img alt="" />` or `<svg aria-hidden="true">` or `role="presentation"`. Never describe a decorative image.
- **Content** (image conveys meaning, no equivalent text on the page) — `alt="…"` describes function, not appearance. "Quarterly revenue chart, Q3 highest", not "blue line graph."
- **Functional image** (linked or in a button) — `alt` describes the destination/action. "Search", not "magnifying glass."

Never both `aria-hidden="true"` and `alt="some text"` on the same element. Empty `alt=""` is correct for decorative; missing `alt` is a violation.

---

## Library decisions — verify at build time

Selection criteria, two to three options. Pick based on framework and deployment:

- **`next/image`** — Next.js stacks. Automatic AVIF/WebP, srcset, lazy, blur placeholder, layout reservation. Default for Next projects.
- **Native `<img>` with `srcset` + `<picture>`** — vanilla, framework-neutral, no build-time optimization. Pair with a build step (Sharp, ImageMagick, squoosh-cli) to emit AVIF/WebP variants.
- **`astro:assets`** — Astro projects. Build-time optimization, similar API to `next/image`.
- **`enhanced:img`** — SvelteKit projects. Same shape.
- **`<v-img>` / Nuxt Image** — Vue/Nuxt stacks.

Selection criteria:

| If | Use |
|---|---|
| Project is Next.js | `next/image` |
| Project is Astro | `astro:assets` |
| Project is Nuxt or SvelteKit | the framework's image component |
| Project is vanilla / Vite / CRA | `<picture>` + `srcset` + a build-time optimizer |
| Image is an SVG | inline as JSX (themeable) or `<img src>` (cacheable) |
| Image is user-generated / hot-loaded | a CDN image transformer (Cloudinary, imgix, Vercel) |

Stack-respect (constitution rule 7): never add a new image library if one is already conventional in the framework. Verify at build time before recommending.

---

## Anti-patterns

- `<img>` without `width`/`height` or `aspect-ratio` — guaranteed CLS.
- `loading="lazy"` on the LCP image — tanks Core Web Vitals.
- Raster icons — pixelate on retina, can't theme.
- Animated GIFs — replace with `<video autoplay muted loop playsinline>` or Lottie.
- `background-image: url(big.jpg)` for hero — bypasses lazy loading and srcset.
- Raw stock photography with no treatment — looks like every other landing page.
- Avatar fallback with random colors — accessibility nightmare; use one tokened brand bg.
- `alt="image of …"` — screen readers already announce "image"; redundant.

---

## Cross-references

- `svg-illustration/SKILL.md` — when image is SVG (icons, illustrations, mockups).
- `ui-design-principles/SKILL.md` — accessibility rubric (rule 5, alt text), spacing rhythm for media-heavy layouts.
- `rich-ui-patterns/SKILL.md` — when media sits inside a browser/device mockup or behind a glass overlay.
- `references/canonical-tokens.md` — token names referenced for avatar sizing and duotone tints.
